import { eq, and, desc } from "drizzle-orm";
import { hasApiKey } from "@/lib/server/anthropic";
import {
  analyzeAgentically,
  toRepositoryModelParts,
} from "@/lib/server/analyze";
import { getDb, hasDb } from "@/lib/server/db";
import { analyses } from "@/lib/server/db/schema";
import { IngestError, resolveRepoHead } from "@/lib/server/github";
import { AnalyzeRequestSchema } from "@/lib/server/schemas";
import type { RepositoryModel } from "@/lib/types";

const INGEST_STATUS: Record<IngestError["code"], number> = {
  invalid_url: 400,
  not_github: 400,
  not_found: 404,
  rate_limited: 429,
  too_large: 413,
  empty_repo: 422,
  github_error: 502,
};

export async function POST(req: Request) {
  const parsed = AnalyzeRequestSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!hasApiKey()) {
    return Response.json(
      {
        error: "no_model",
        message:
          "Live repository analysis needs the model configured — try the demo instead.",
      },
      { status: 503 },
    );
  }

  // Deterministic validation: github.com only, public, real, size-capped.
  let head;
  try {
    head = await resolveRepoHead(parsed.data.url);
  } catch (err) {
    if (err instanceof IngestError) {
      return Response.json(
        { error: err.code, message: err.message },
        { status: INGEST_STATUS[err.code] },
      );
    }
    throw err;
  }

  // Learned once per commit (CLAUDE.md §13): reuse a stored analysis.
  if (hasDb()) {
    const existing = await getDb()
      .select()
      .from(analyses)
      .where(
        and(
          eq(analyses.repoId, head.repoId),
          eq(analyses.commitSha, head.commitSha),
        ),
      )
      .orderBy(desc(analyses.createdAt))
      .limit(1);
    if (existing.length > 0) {
      return Response.json({
        repoId: head.repoId,
        commitSha: head.commitSha,
        model: existing[0].model as RepositoryModel,
        cached: true,
      });
    }
  }

  try {
    const gen = await analyzeAgentically(head);
    const { model, evidence } = toRepositoryModelParts(gen, head);

    if (hasDb()) {
      await getDb()
        .insert(analyses)
        .values({
          repoId: head.repoId,
          commitSha: head.commitSha,
          model: model as object,
          evidence: evidence as object,
        })
        .onConflictDoNothing();
    }

    return Response.json({
      repoId: head.repoId,
      commitSha: head.commitSha,
      model,
      cached: false,
    });
  } catch (err) {
    console.error("analyze failed", err);
    return Response.json(
      {
        error: "analysis_failed",
        message:
          "The analysis didn't complete — this can happen on very large or unusual repositories. Try again, or try a smaller repo.",
      },
      { status: 502 },
    );
  }
}
