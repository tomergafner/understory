import { and, eq } from "drizzle-orm";
import type { CodeExcerpt, RepositoryModel } from "../types";
import {
  analyzeAgentically,
  quickAnalyze,
  toRepositoryModelParts,
} from "./analyze";
import { getDb, hasDb } from "./db";
import { analyses } from "./db/schema";
import { fetchReadme, type RepoHead } from "./github";

// Two-stage analysis (docs/DECISIONS.md 015):
// Stage 1 — starter curriculum from README only, returned inline (~15-25s) so
//   learning starts immediately.
// Stage 2 — the agentic deep pass runs as a background job on this long-lived
//   Node server (it outlives Cloudflare's ~100s proxy timeout), seeded with the
//   starter's concept ids so the curriculum upgrades in place. The in-flight
//   map doubles as the duplicate-analysis lock (CLAUDE.md §8, sans Redis).

type JobResult = {
  model: RepositoryModel;
  evidence: Record<string, CodeExcerpt>;
};

const quickResults = new Map<string, JobResult>();
const deepInFlight = new Map<string, Promise<void>>();
const deepResults = new Map<string, JobResult>(); // single-instance memory cache
const deepFailures = new Set<string>();

const key = (head: RepoHead) => `${head.repoId}@${head.commitSha}`;

export type AnalysisStatus =
  | { status: "done"; model: RepositoryModel }
  | { status: "partial"; model: RepositoryModel; deepFailed?: boolean }
  | { status: "failed"; message: string };

async function loadDeepFromDb(head: RepoHead): Promise<JobResult | null> {
  if (!hasDb()) return null;
  const rows = await getDb()
    .select()
    .from(analyses)
    .where(
      and(
        eq(analyses.repoId, head.repoId),
        eq(analyses.commitSha, head.commitSha),
      ),
    )
    .limit(1);
  if (rows.length === 0) return null;
  return {
    model: rows[0].model as RepositoryModel,
    evidence: rows[0].evidence as Record<string, CodeExcerpt>,
  };
}

function startDeepJob(head: RepoHead, starterModel: RepositoryModel) {
  const k = key(head);
  if (deepInFlight.has(k)) return;
  const job = (async () => {
    try {
      const gen = await analyzeAgentically(
        head,
        starterModel.concepts.map((c) => ({
          id: c.id,
          title: c.title,
          summary: c.summary,
        })),
      );
      const parts = toRepositoryModelParts(gen, head);
      deepResults.set(k, parts);
      if (hasDb()) {
        await getDb()
          .insert(analyses)
          .values({
            repoId: head.repoId,
            commitSha: head.commitSha,
            model: parts.model as object,
            evidence: parts.evidence as object,
          })
          .onConflictDoNothing();
      }
    } catch (err) {
      console.error("deep analysis failed", k, err);
      deepFailures.add(k);
    } finally {
      deepInFlight.delete(k);
    }
  })();
  deepInFlight.set(k, job);
}

export async function getOrStartAnalysis(
  head: RepoHead,
): Promise<AnalysisStatus> {
  const k = key(head);

  const deep = deepResults.get(k) ?? (await loadDeepFromDb(head));
  if (deep) {
    deepResults.set(k, deep);
    return { status: "done", model: deep.model };
  }

  // Stage 1, inline on the first request for this commit.
  if (!quickResults.has(k)) {
    try {
      const readme = await fetchReadme(head.owner, head.repo, head.commitSha);
      const gen = await quickAnalyze({ ...head, readme });
      const parts = toRepositoryModelParts(gen, head);
      parts.model.partial = true;
      quickResults.set(k, parts);
    } catch (err) {
      console.error("quick analysis failed", k, err);
      return {
        status: "failed",
        message:
          "The analysis didn't complete — please try again in a moment.",
      };
    }
  }
  const quick = quickResults.get(k)!;

  if (deepFailures.has(k)) {
    // Learning continues on the starter curriculum; a later retry may succeed.
    deepFailures.delete(k);
    return { status: "partial", model: quick.model, deepFailed: true };
  }

  startDeepJob(head, quick.model);
  return { status: "partial", model: quick.model };
}

// Loop routes use this so lessons during the partial phase can still ground
// themselves once deep evidence exists.
export function deepEvidenceFor(
  repoId: string,
): Record<string, CodeExcerpt> | null {
  for (const [k, result] of deepResults) {
    if (k.startsWith(`${repoId}@`)) return result.evidence;
  }
  return null;
}
