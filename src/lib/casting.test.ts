import { describe, expect, mock, test } from "bun:test";
import { buildPersonas, parsePersonasJson } from "@/lib/casting.ts";

mock.module("@/lib/credentials.ts", () => ({
  getPrimaryProvider: () => "anthropic" as const,
  getApiKey: () => undefined,
  loadCredentials: () => ({}),
  saveCredentials: () => {},
  hasRequiredKeys: () => false,
}));

describe("parsePersonasJson", () => {
  test("parses clean JSON array", () => {
    const input = JSON.stringify([
      { name: "Alice", expertise: "AI", perspective: "optimist" },
      { name: "Bob", expertise: "Security", perspective: "skeptic" },
    ]);
    const result = parsePersonasJson(input);
    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe("Alice");
  });

  test("extracts JSON from surrounding text", () => {
    const input = `Here are the personas:
[
  {"name": "Alice", "expertise": "AI", "perspective": "optimist"}
]
Hope this helps!`;
    const result = parsePersonasJson(input);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Alice");
  });

  test("throws on missing JSON", () => {
    expect(() => parsePersonasJson("no json here")).toThrow(
      "Failed to parse personas JSON",
    );
  });
});

describe("buildPersonas", () => {
  const raw = [
    { name: "Alice", expertise: "AI", perspective: "optimist" },
    { name: "Bob", expertise: "Security", perspective: "skeptic" },
    { name: "Carol", expertise: "Business", perspective: "pragmatist" },
  ];

  test("assigns sequential IDs", () => {
    const personas = buildPersonas(raw);
    expect(personas.map((p) => p.id)).toEqual([
      "persona-0",
      "persona-1",
      "persona-2",
    ]);
  });

  test("assigns distinct colors", () => {
    const personas = buildPersonas(raw);
    const colors = personas.map((p) => p.color);
    expect(new Set(colors).size).toBe(3);
  });

  test("cycles colors for more than 5 personas", () => {
    const sixPersonas = Array.from({ length: 6 }, (_, i) => ({
      name: `P${i}`,
      expertise: "E",
      perspective: "V",
    }));
    const personas = buildPersonas(sixPersonas);
    expect(personas[0]?.color).toBe(personas[5]?.color);
  });

  test("assigns default model when no model_category", () => {
    const personas = buildPersonas(raw);
    expect(personas.every((p) => p.model === "claude-sonnet-4-6")).toBe(true);
  });

  test("maps model_category to correct models", () => {
    const rawWithCategories = [
      {
        name: "Researcher",
        expertise: "E",
        perspective: "V",
        model_category: "web_search",
      },
      {
        name: "Analyst",
        expertise: "E",
        perspective: "V",
        model_category: "reasoning",
      },
      {
        name: "Ideator",
        expertise: "E",
        perspective: "V",
        model_category: "creative",
      },
    ];
    const personas = buildPersonas(rawWithCategories);
    expect(personas[0]?.model).toBe("claude-sonnet-4-6");
    expect(personas[1]?.model).toBe("claude-opus-4-6");
    expect(personas[2]?.model).toBe("claude-sonnet-4-6");
  });

  test("assigns web_search tool to web_search category", () => {
    const rawWithSearch = [
      {
        name: "Researcher",
        expertise: "E",
        perspective: "V",
        model_category: "web_search",
      },
      {
        name: "Analyst",
        expertise: "E",
        perspective: "V",
        model_category: "reasoning",
      },
    ];
    const personas = buildPersonas(rawWithSearch);
    expect(personas[0]?.tools).toEqual(["web_search"]);
    expect(personas[1]?.tools).toBeUndefined();
  });

  test("falls back to default model for unknown category", () => {
    const rawWithUnknown = [
      {
        name: "X",
        expertise: "E",
        perspective: "V",
        model_category: "unknown_category",
      },
    ];
    const personas = buildPersonas(rawWithUnknown);
    expect(personas[0]?.model).toBe("claude-sonnet-4-6");
  });

  test("preserves name, expertise, perspective", () => {
    const personas = buildPersonas(raw);
    expect(personas[0]?.name).toBe("Alice");
    expect(personas[0]?.expertise).toBe("AI");
    expect(personas[0]?.perspective).toBe("optimist");
  });
});
