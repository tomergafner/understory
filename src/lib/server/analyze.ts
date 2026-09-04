import type Anthropic from "@anthropic-ai/sdk";
import { getClient, getEffort, getModel, logUsage } from "./anthropic";
import { GeneratedRepoModelSchema, type GeneratedRepoModel } from "./schemas";

// Agentic repository analysis (docs/DECISIONS.md 014): the request carries the
// URL and our purpose only — Claude reads the repository itself via Anthropic's
// web_fetch tool and returns the knowledge structure through a strict tool call.

const SUBMIT_TOOL_NAME = "submit_repository_model";

// Hand-written JSON schema (strict mode needs additionalProperties:false
// throughout); the zod schema below remains the authoritative validator.
const SUBMIT_TOOL: Anthropic.Messages.ToolUnion = {
  name: SUBMIT_TOOL_NAME,
  description:
    "Submit the final repository analysis. Call exactly once, when you have read enough of the repository to produce a confident curriculum.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["description", "languages", "concepts"],
    properties: {
      description: { type: "string" },
      languages: { type: "array", items: { type: "string" } },
      concepts: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "title",
            "summary",
            "level",
            "weight",
            "goals",
            "prerequisites",
            "evidence",
          ],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            summary: { type: "string" },
            level: { type: "integer" },
            weight: { type: "integer" },
            goals: {
              type: "array",
              items: {
                type: "string",
                enum: ["understand", "use", "architecture", "contribute"],
              },
            },
            prerequisites: { type: "array", items: { type: "string" } },
            evidence: {
              anyOf: [
                { type: "null" },
                {
                  type: "object",
                  additionalProperties: false,
                  required: ["path", "startLine", "endLine", "code"],
                  properties: {
                    path: { type: "string" },
                    startLine: { type: "integer" },
                    endLine: { type: "integer" },
                    code: { type: "string" },
                  },
                },
              ],
            },
          },
        },
      },
    },
  },
};

const ANALYSIS_SYSTEM = `You are the repository analyst for Understory, an adaptive tutor that teaches unfamiliar codebases the way a great teacher would: one small concept at a time, tested before advancing, with memorable analogies, contrast with alternative tools, and a path that reshapes itself around the learner's demonstrated understanding.

Your job: actively read a public GitHub repository with web_fetch, then produce its teaching curriculum.

How to read the repository efficiently:
- Fetch raw file contents from https://raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}
- Fetch https://api.github.com/repos/{owner}/{repo}/git/trees/{ref}?recursive=1 for the file listing
- Read the README and manifest first, then the handful of source files that reveal the architecture. Prefer depth on a few important files over breadth.

Curriculum rules:
- 6-16 concepts in teaching order, level 1 (what is this) through level 5 (design tradeoffs); levels 6-7 (critical code paths, contribution readiness) only where you actually read the relevant code.
- ids kebab-case and unique; prerequisites reference your own listed ids only.
- summary: one concrete sentence; separate observed facts from inference ("likely" when inferring intent).
- goals: which learner goals each concept serves; early concepts usually all, deep internals usually architecture/contribute.
- weight: integer 1-5, importance toward understanding this repository.
- evidence: a SMALL excerpt (5-20 lines) copied verbatim from a file you actually fetched, with its exact repository path; null when nothing suitable was read. Never fabricate paths or code.
- description: one crisp sentence, no marketing language.

When you have read enough, call ${SUBMIT_TOOL_NAME} exactly once with the full analysis.`;

export async function analyzeAgentically(args: {
  owner: string;
  repo: string;
  commitSha: string;
}): Promise<GeneratedRepoModel> {
  const startedAt = Date.now();

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Analyze https://github.com/${args.owner}/${args.repo} at commit ${args.commitSha}. Read what you need, then submit the curriculum.`,
    },
  ];

  const tools: Anthropic.Messages.ToolUnion[] = [
    { type: "web_fetch_20260209", name: "web_fetch", max_uses: 20 },
    SUBMIT_TOOL,
  ];

  let nudged = false;
  for (let turn = 0; turn < 10; turn++) {
    const response = await getClient().messages.create({
      model: getModel(),
      max_tokens: 16000,
      system: [
        {
          type: "text",
          text: ANALYSIS_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
      tools,
      output_config: { effort: getEffort() },
    });
    logUsage("analyze", startedAt, response.usage);

    if (response.stop_reason === "refusal") throw new Error("model_refusal");

    const submit = response.content.find(
      (b): b is Anthropic.ToolUseBlock =>
        b.type === "tool_use" && b.name === SUBMIT_TOOL_NAME,
    );
    if (submit) {
      return GeneratedRepoModelSchema.parse(submit.input);
    }

    if (response.stop_reason === "pause_turn") {
      // Server-side web_fetch loop paused — resume where it left off.
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    if (response.stop_reason === "end_turn" && !nudged) {
      nudged = true;
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: `Call ${SUBMIT_TOOL_NAME} now with your completed analysis.`,
      });
      continue;
    }

    throw new Error(`analysis_incomplete (${response.stop_reason})`);
  }
  throw new Error("analysis_exceeded_turns");
}

// Deterministic sanitation between model output and application state:
// dedup ids, drop dangling prerequisites, cap counts.
export function toRepositoryModelParts(
  gen: GeneratedRepoModel,
  meta: {
    repoId: string;
    owner: string;
    repo: string;
    commitSha: string;
  },
) {
  const seen = new Set<string>();
  const concepts = gen.concepts.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
  const ids = new Set(concepts.map((c) => c.id));

  const model = {
    id: meta.repoId,
    repoUrl: `https://github.com/${meta.owner}/${meta.repo}`,
    owner: meta.owner,
    name: meta.repo,
    commitLabel: meta.commitSha.slice(0, 7),
    description: gen.description,
    languages: gen.languages,
    concepts: concepts.map((c) => ({
      id: c.id,
      title: c.title,
      summary: c.summary,
      level: c.level,
      weight: c.weight,
      goals: c.goals,
      prerequisites: c.prerequisites.filter((p) => ids.has(p) && p !== c.id),
    })),
  };

  const evidence: Record<
    string,
    { path: string; startLine: number; endLine: number; code: string }
  > = {};
  for (const c of concepts) {
    if (c.evidence && c.evidence.code.trim().length > 0) {
      evidence[c.id] = c.evidence;
    }
  }
  return { model, evidence };
}
