import { hasApiKey } from "@/lib/server/anthropic";
import { getOrStartAnalysis } from "@/lib/server/analysis-jobs";
import { IngestError, resolveRepoHead } from "@/lib/server/github";
import { AnalyzeRequestSchema } from "@/lib/server/schemas";

const INGEST_STATUS: Record<IngestError["code"], number> = {
  invalid_url: 400,
  not_github: 400,
  not_found: 404,
  rate_limited: 429,
  too_large: 413,
  empty_repo: 422,
  github_error: 502,
};

// Async job protocol: the same POST both starts and polls the analysis.
// Responses: 200 {status:"done", ...} | 202 {status:"analyzing"} |
// 502 {status:"failed", message} (retryable) | 4xx ingest errors.
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

  const state = await getOrStartAnalysis(head);
  if (state.status === "failed") {
    return Response.json(
      { status: "failed", error: "analysis_failed", message: state.message },
      { status: 502 },
    );
  }
  // "partial": the starter curriculum — learning begins now while the deep
  // pass runs in the background. "done": the deep curriculum.
  return Response.json({
    status: state.status,
    repoId: head.repoId,
    commitSha: head.commitSha,
    model: state.model,
    deepFailed: state.status === "partial" ? (state.deepFailed ?? false) : false,
  });
}
