import { config } from "@/config.ts";
import { getLLMClient } from "@/lib/llm-client.ts";
import { buildProtocolSelectionPrompt } from "@/lib/prompts.ts";
import { withRetry } from "@/lib/retry.ts";
import type { ProtocolType } from "@/types.ts";

const VALID_PROTOCOLS: ProtocolType[] = [
  "round-robin",
  "devils-advocate",
  "dialectical",
  "ngt",
  "stepladder",
  "delphi",
];

export type ProtocolSelection = {
  protocol: ProtocolType;
  reason: string;
};

export async function selectProtocol(
  topic: string,
): Promise<ProtocolSelection> {
  return withRetry(async () => {
    const client = getLLMClient(config.defaultModel);
    const text = await client.generate({
      model: config.defaultModel,
      system: "",
      userPrompt: buildProtocolSelectionPrompt(topic),
      maxTokens: 256,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse protocol selection JSON");

    const raw = JSON.parse(jsonMatch[0]) as {
      protocol: string;
      reason: string;
    };

    const protocol = VALID_PROTOCOLS.includes(raw.protocol as ProtocolType)
      ? (raw.protocol as ProtocolType)
      : "round-robin";

    return { protocol, reason: raw.reason };
  });
}
