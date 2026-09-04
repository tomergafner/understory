import Anthropic from "@anthropic-ai/sdk";

// Server-only. CLAUDE.md §6: model configurable via env, never scattered.
// Default is claude-fable-5 — CLAUDE.md's "claude-fable-5-1" is not a real
// model ID (verified against the API model catalog).
const DEFAULT_MODEL = "claude-fable-5";

export function getModel(): string {
  return process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
}

export function getEffort(): "low" | "medium" | "high" {
  const effort = process.env.ANTHROPIC_EFFORT;
  if (effort === "low" || effort === "medium" || effort === "high") return effort;
  return "medium"; // interactive tutoring: balance latency and quality
}

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  }
  return client;
}

// §13 cost/latency discipline: one log line per model call.
export function logUsage(
  route: string,
  startedAt: number,
  usage: { input_tokens: number; output_tokens: number } | null,
) {
  console.log(
    JSON.stringify({
      at: "anthropic",
      route,
      model: getModel(),
      ms: Date.now() - startedAt,
      usage,
    }),
  );
}
