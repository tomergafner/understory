import { and, eq } from "drizzle-orm";
import type { CodeExcerpt, RepositoryModel } from "../types";
import { analyzeAgentically, toRepositoryModelParts } from "./analyze";
import { getDb, hasDb } from "./db";
import { analyses } from "./db/schema";
import type { RepoHead } from "./github";

// Agentic analysis outlives Cloudflare's ~100s proxy timeout, so it runs as a
// background job on this long-lived Node server: POST starts it and returns
// "analyzing"; the client re-POSTs to poll. The in-flight map also prevents
// duplicate simultaneous analysis of the same commit (CLAUDE.md §8, sans Redis).

type JobResult = {
  model: RepositoryModel;
  evidence: Record<string, CodeExcerpt>;
};

const inFlight = new Map<string, Promise<void>>();
const results = new Map<string, JobResult>(); // single-instance memory cache
const failures = new Map<string, string>();

const key = (head: RepoHead) => `${head.repoId}@${head.commitSha}`;

export type AnalysisStatus =
  | { status: "done"; model: RepositoryModel }
  | { status: "analyzing" }
  | { status: "failed"; message: string };

export async function getOrStartAnalysis(
  head: RepoHead,
): Promise<AnalysisStatus> {
  const k = key(head);

  const cached = results.get(k);
  if (cached) return { status: "done", model: cached.model };

  if (hasDb()) {
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
    if (rows.length > 0) {
      const result = {
        model: rows[0].model as RepositoryModel,
        evidence: rows[0].evidence as Record<string, CodeExcerpt>,
      };
      results.set(k, result);
      return { status: "done", model: result.model };
    }
  }

  if (inFlight.has(k)) return { status: "analyzing" };

  const failure = failures.get(k);
  if (failure) {
    failures.delete(k); // this poll reports it; the next POST retries fresh
    return { status: "failed", message: failure };
  }

  const job = (async () => {
    try {
      const gen = await analyzeAgentically(head);
      const parts = toRepositoryModelParts(gen, head);
      results.set(k, parts);
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
      console.error("analysis job failed", k, err);
      failures.set(
        k,
        "The analysis didn't complete — this can happen on very large or unusual repositories. Try again, or try a smaller repo.",
      );
    } finally {
      inFlight.delete(k);
    }
  })();
  inFlight.set(k, job);

  return { status: "analyzing" };
}
