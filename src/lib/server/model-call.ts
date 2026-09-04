import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { getClient, getEffort, getModel, logUsage } from "./anthropic";
import { TUTOR_SYSTEM } from "./prompts";

// One structured call: stable cached system prompt, volatile context in the
// user turn, schema-validated output. Throws on refusal or schema mismatch —
// callers fall back to fixtures.
export async function callModel<T extends z.ZodType>(
  route: string,
  prompt: string,
  schema: T,
  opts?: {
    maxTokens?: number;
    effort?: "low" | "medium" | "high";
    systemText?: string;
  },
): Promise<z.infer<T>> {
  const startedAt = Date.now();
  const response = await getClient().messages.parse({
    model: getModel(),
    max_tokens: opts?.maxTokens ?? 8000,
    system: [
      {
        type: "text",
        text: opts?.systemText ?? TUTOR_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: prompt }],
    output_config: {
      effort: opts?.effort ?? getEffort(),
      format: zodOutputFormat(schema),
    },
  });
  logUsage(route, startedAt, response.usage);

  if (response.stop_reason === "refusal") {
    throw new Error("model_refusal");
  }
  if (response.parsed_output == null) {
    throw new Error("schema_validation_failed");
  }
  return response.parsed_output;
}
