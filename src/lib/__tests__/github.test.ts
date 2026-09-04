import { describe, expect, it } from "vitest";
import {
  filterTree,
  IngestError,
  LIMITS,
  parseGitHubUrl,
  selectSeedPaths,
} from "../server/github";

describe("parseGitHubUrl", () => {
  it("normalizes common URL shapes", () => {
    expect(parseGitHubUrl("https://github.com/expressjs/express").repoId).toBe(
      "gh:expressjs/express",
    );
    expect(parseGitHubUrl("github.com/ExpressJS/Express.git").repoId).toBe(
      "gh:expressjs/express",
    );
    expect(
      parseGitHubUrl("https://github.com/owner/repo/tree/main/src").repoId,
    ).toBe("gh:owner/repo");
  });

  it("rejects non-GitHub hosts with a specific code", () => {
    try {
      parseGitHubUrl("https://gitlab.com/foo/bar");
      expect.unreachable();
    } catch (e) {
      expect((e as IngestError).code).toBe("not_github");
    }
  });

  it("rejects incomplete and malformed paths", () => {
    expect(() => parseGitHubUrl("github.com/onlyowner")).toThrow(IngestError);
    expect(() => parseGitHubUrl("not a url at all")).toThrow(IngestError);
  });
});

describe("filterTree", () => {
  const entries = [
    { path: "src/index.ts", type: "blob", size: 100 },
    { path: "node_modules/lodash/index.js", type: "blob", size: 100 },
    { path: "dist/bundle.min.js", type: "blob", size: 100 },
    { path: "package-lock.json", type: "blob", size: 100 },
    { path: "logo.png", type: "blob", size: 100 },
    { path: "src", type: "tree" },
    { path: "vendor/lib.go", type: "blob", size: 100 },
    { path: "README.md", type: "blob", size: 100 },
  ];

  it("drops vendored dirs, lockfiles, binaries, and non-blobs", () => {
    const paths = filterTree(entries).map((e) => e.path);
    expect(paths).toEqual(["src/index.ts", "README.md"]);
  });
});

describe("selectSeedPaths", () => {
  it("prefers README and manifests, then entrypoints, capped", () => {
    const tree = [
      { path: "src/util.ts", size: 10 },
      { path: "README.md", size: 10 },
      { path: "package.json", size: 10 },
      { path: "src/index.ts", size: 10 },
    ];
    const seeds = selectSeedPaths(tree);
    expect(seeds[0]).toBe("README.md");
    expect(seeds[1]).toBe("package.json");
    expect(seeds).toContain("src/index.ts");
    expect(seeds.length).toBeLessThanOrEqual(LIMITS.maxSeedFiles);
  });

  it("skips oversized files", () => {
    const seeds = selectSeedPaths([
      { path: "README.md", size: LIMITS.maxSeedFileBytes + 1 },
      { path: "package.json", size: 10 },
    ]);
    expect(seeds).not.toContain("README.md");
  });
});
