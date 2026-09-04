import { desc, eq } from "drizzle-orm";
import { getRepoContent } from "../content";
import type { CodeExcerpt, RepositoryModel } from "../types";
import { getDb, hasDb } from "./db";
import { analyses } from "./db/schema";

// Content resolution for the loop routes: fixture repos come from code,
// live-analyzed repos ("gh:owner/repo") come from the analyses table.

export interface ResolvedContent {
  model: RepositoryModel;
  evidence: Record<string, CodeExcerpt>;
  isFixture: boolean;
}

export async function resolveContent(repoId: string): Promise<ResolvedContent> {
  if (!repoId.startsWith("gh:")) {
    const fixture = getRepoContent(repoId); // throws for unknown ids
    return {
      model: fixture.model,
      evidence: fixture.evidence,
      isFixture: true,
    };
  }
  if (!hasDb()) throw new Error("no_db_for_live_repo");
  const rows = await getDb()
    .select()
    .from(analyses)
    .where(eq(analyses.repoId, repoId))
    .orderBy(desc(analyses.createdAt))
    .limit(1);
  if (rows.length === 0) throw new Error("analysis_not_found");
  return {
    model: rows[0].model as RepositoryModel,
    evidence: rows[0].evidence as Record<string, CodeExcerpt>,
    isFixture: false,
  };
}
