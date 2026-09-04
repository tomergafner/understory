// Deterministic public-GitHub ingestion (CLAUDE.md §5).
// Uses the REST contents/trees APIs — no archive download, no extraction,
// no code execution; path-traversal is structurally impossible.

const API = "https://api.github.com";

// Resource limits — deterministic application code, not model judgment.
export const LIMITS = {
  maxRepoSizeKb: 2_000_000, // 2 GB metadata size → refuse
  maxTreeEntries: 20_000, // refuse beyond this many files
  maxTreeListed: 1_500, // paths shown to the model
  maxSeedFiles: 12,
  maxSeedFileBytes: 48_000,
  maxTotalSeedBytes: 280_000,
};

export class IngestError extends Error {
  constructor(
    public code:
      | "invalid_url"
      | "not_github"
      | "not_found"
      | "rate_limited"
      | "too_large"
      | "empty_repo"
      | "github_error",
    message: string,
  ) {
    super(message);
  }
}

export interface ParsedRepo {
  owner: string;
  repo: string;
  repoId: string; // "gh:owner/repo"
}

export function parseGitHubUrl(input: string): ParsedRepo {
  const trimmed = input.trim();
  if (!trimmed) throw new IngestError("invalid_url", "Empty URL.");
  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new IngestError("invalid_url", "That doesn't look like a URL.");
  }
  const host = url.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") {
    throw new IngestError(
      "not_github",
      "Only public GitHub repositories are supported at the moment.",
    );
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new IngestError(
      "invalid_url",
      "Expected github.com/owner/repository.",
    );
  }
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, "");
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) {
    throw new IngestError("invalid_url", "Unrecognized repository path.");
  }
  return { owner, repo, repoId: `gh:${owner.toLowerCase()}/${repo.toLowerCase()}` };
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "understory-tutor",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}

async function gh(path: string): Promise<unknown> {
  const res = await fetch(`${API}${path}`, { headers: headers() });
  if (res.status === 404) {
    throw new IngestError(
      "not_found",
      "Repository not found — it may be private or misspelled.",
    );
  }
  if (
    res.status === 403 &&
    res.headers.get("x-ratelimit-remaining") === "0"
  ) {
    throw new IngestError(
      "rate_limited",
      "GitHub's rate limit was hit — try again in a few minutes.",
    );
  }
  if (!res.ok) {
    throw new IngestError("github_error", `GitHub returned ${res.status}.`);
  }
  return res.json();
}

// ---- Filtering (deterministic) ----

const IGNORED_DIRS =
  /(^|\/)(node_modules|vendor|dist|build|out|target|\.git|\.next|__pycache__|\.venv|venv|coverage|third_party|external)(\/|$)/;
const IGNORED_FILES =
  /(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Cargo\.lock|poetry\.lock|composer\.lock|go\.sum|\.min\.(js|css))$/;
const BINARY_EXT =
  /\.(png|jpe?g|gif|webp|ico|svg|pdf|zip|gz|tar|jar|war|class|so|dylib|dll|exe|bin|woff2?|ttf|eot|mp[34]|mov|avi|wasm|db|sqlite|lockb)$/i;

export interface TreeEntry {
  path: string;
  size: number;
}

export function filterTree(
  entries: { path: string; type: string; size?: number }[],
): TreeEntry[] {
  return entries
    .filter((e) => e.type === "blob")
    .filter((e) => !IGNORED_DIRS.test(e.path))
    .filter((e) => !IGNORED_FILES.test(e.path))
    .filter((e) => !BINARY_EXT.test(e.path))
    .map((e) => ({ path: e.path, size: e.size ?? 0 }));
}

// ---- Seed file selection (deterministic) ----

const SEED_PATTERNS: RegExp[] = [
  /^readme\.(md|rst|txt)$/i,
  /^readme$/i,
  /^(package\.json|pyproject\.toml|go\.mod|cargo\.toml|composer\.json|pom\.xml|build\.gradle|gemfile|setup\.py|mix\.exs)$/i,
  /^(docs|doc)\/(index|readme|architecture|design|overview)\.(md|rst)$/i,
  /^(architecture|design|contributing)\.md$/i,
  /^(src\/)?(index|main|app|server|cli)\.(ts|js|tsx|jsx|py|go|rs|rb|java|php|ex)$/i,
  /^(src|lib|app)\/[^/]+\.(ts|js|py|go|rs|rb)$/i,
  /^[^/]+\.(ts|js|py|go|rs|rb)$/i,
];

export function selectSeedPaths(tree: TreeEntry[]): string[] {
  const chosen: string[] = [];
  const seen = new Set<string>();
  for (const pattern of SEED_PATTERNS) {
    for (const entry of tree) {
      if (chosen.length >= LIMITS.maxSeedFiles) return chosen;
      if (seen.has(entry.path)) continue;
      if (entry.size > LIMITS.maxSeedFileBytes) continue;
      if (pattern.test(entry.path)) {
        chosen.push(entry.path);
        seen.add(entry.path);
      }
    }
  }
  return chosen;
}

// Lightweight validation used by the agentic path: confirms the repo is
// public and real, pins the head commit, and enforces the size cap — without
// downloading any content ourselves.
export interface RepoHead {
  owner: string;
  repo: string;
  repoId: string;
  description: string;
  defaultBranch: string;
  commitSha: string;
  primaryLanguage: string | null;
}

export async function resolveRepoHead(urlInput: string): Promise<RepoHead> {
  const { owner, repo, repoId } = parseGitHubUrl(urlInput);
  const meta = (await gh(`/repos/${owner}/${repo}`)) as {
    default_branch: string;
    description: string | null;
    size: number;
    language: string | null;
  };
  if (meta.size > LIMITS.maxRepoSizeKb) {
    throw new IngestError(
      "too_large",
      "This repository is too large for the current limits.",
    );
  }
  const branch = (await gh(
    `/repos/${owner}/${repo}/branches/${encodeURIComponent(meta.default_branch)}`,
  )) as { commit: { sha: string } };
  return {
    owner,
    repo,
    repoId,
    description: meta.description ?? "",
    defaultBranch: meta.default_branch,
    commitSha: branch.commit.sha,
    primaryLanguage: meta.language,
  };
}

// README for the fast stage-1 starter analysis (metadata + README only).
export async function fetchReadme(
  owner: string,
  repo: string,
  ref: string,
): Promise<string | null> {
  try {
    const file = (await gh(`/repos/${owner}/${repo}/readme?ref=${ref}`)) as {
      content?: string;
      encoding?: string;
    };
    if (file.encoding !== "base64" || !file.content) return null;
    return Buffer.from(file.content, "base64")
      .toString("utf-8")
      .slice(0, 30_000);
  } catch {
    return null;
  }
}

// ---- Snapshot (Stage A of CLAUDE.md §5) ----

export interface RepoSnapshot {
  owner: string;
  repo: string;
  repoId: string;
  description: string;
  defaultBranch: string;
  commitSha: string;
  primaryLanguage: string | null;
  tree: TreeEntry[]; // filtered, capped at maxTreeListed
  treeTotal: number; // filtered count before capping
  truncatedTree: boolean;
  seeds: { path: string; content: string }[];
}

export async function ingestRepo(urlInput: string): Promise<RepoSnapshot> {
  const { owner, repo, repoId } = parseGitHubUrl(urlInput);

  const meta = (await gh(`/repos/${owner}/${repo}`)) as {
    default_branch: string;
    description: string | null;
    size: number;
    language: string | null;
  };
  if (meta.size > LIMITS.maxRepoSizeKb) {
    throw new IngestError(
      "too_large",
      "This repository is too large for the current limits.",
    );
  }

  const branch = (await gh(
    `/repos/${owner}/${repo}/branches/${encodeURIComponent(meta.default_branch)}`,
  )) as { commit: { sha: string } };
  const commitSha = branch.commit.sha;

  const treeResp = (await gh(
    `/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`,
  )) as {
    tree: { path: string; type: string; size?: number }[];
    truncated: boolean;
  };
  if (treeResp.tree.length > LIMITS.maxTreeEntries) {
    throw new IngestError(
      "too_large",
      "This repository has too many files for the current limits.",
    );
  }
  const filtered = filterTree(treeResp.tree);
  if (filtered.length === 0) {
    throw new IngestError(
      "empty_repo",
      "No readable source files were found in this repository.",
    );
  }

  const seedPaths = selectSeedPaths(filtered);
  const seeds: { path: string; content: string }[] = [];
  let totalBytes = 0;
  for (const path of seedPaths) {
    if (totalBytes >= LIMITS.maxTotalSeedBytes) break;
    try {
      const file = (await gh(
        `/repos/${owner}/${repo}/contents/${path}?ref=${commitSha}`,
      )) as { content?: string; encoding?: string };
      if (file.encoding !== "base64" || !file.content) continue;
      const content = Buffer.from(file.content, "base64").toString("utf-8");
      totalBytes += content.length;
      seeds.push({ path, content });
    } catch {
      // a single unreadable seed never fails the ingest
    }
  }

  return {
    owner,
    repo,
    repoId,
    description: meta.description ?? "",
    defaultBranch: meta.default_branch,
    commitSha,
    primaryLanguage: meta.language,
    tree: filtered.slice(0, LIMITS.maxTreeListed),
    treeTotal: filtered.length,
    truncatedTree: treeResp.truncated || filtered.length > LIMITS.maxTreeListed,
    seeds,
  };
}
