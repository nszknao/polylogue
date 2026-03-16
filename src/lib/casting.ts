import { config } from "@/config.ts";
import { getLLMClient } from "@/lib/llm-client.ts";
import { buildPersonaGenerationPrompt } from "@/lib/prompts.ts";
import { withRetry } from "@/lib/retry.ts";
import type { Persona, PersonaTool } from "@/types.ts";

const PERSONA_COLORS = ["red", "green", "yellow", "blue", "magenta"] as const;

type ModelCategory = "reasoning" | "creative" | "web_search";

const MODEL_MAP: Record<ModelCategory, string> = {
  reasoning: "claude-sonnet-4-20250514",
  creative: "claude-haiku-4-5-20251001",
  web_search: "gpt-4o",
};

const VALID_CATEGORIES = new Set<string>(Object.keys(MODEL_MAP));

type RawPersona = {
  name: string;
  expertise: string;
  perspective: string;
  model_category?: string;
};

export function parsePersonasJson(text: string): RawPersona[] {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Failed to parse personas JSON");
  return JSON.parse(jsonMatch[0]) as RawPersona[];
}

function resolveModel(category?: string): string {
  if (category && VALID_CATEGORIES.has(category)) {
    return MODEL_MAP[category as ModelCategory];
  }
  return config.defaultModel;
}

function isWebSearchModel(model: string): boolean {
  return model.startsWith("gpt-") || model.startsWith("o");
}

export function buildPersonas(raw: RawPersona[]): Persona[] {
  return raw.map((p, i) => {
    const model = resolveModel(p.model_category);
    const tools: PersonaTool[] | undefined = isWebSearchModel(model)
      ? ["web_search"]
      : undefined;
    return {
      id: `persona-${i}`,
      name: p.name,
      expertise: p.expertise,
      perspective: p.perspective,
      color: PERSONA_COLORS[i % PERSONA_COLORS.length] ?? "white",
      model,
      tools,
    };
  });
}

export async function castPersonas(topic: string): Promise<Persona[]> {
  const raw = await withRetry(async () => {
    const client = getLLMClient(config.defaultModel);
    const text = await client.generate({
      model: config.defaultModel,
      system: "",
      userPrompt: buildPersonaGenerationPrompt(topic),
      maxTokens: 2048,
    });
    return parsePersonasJson(text);
  });

  return buildPersonas(raw);
}
