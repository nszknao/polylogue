import { describe, expect, test } from "bun:test";
import type { Persona, RoundContext } from "@/types.ts";
import { assignRoles, getProtocol } from "./index.ts";

function makePersonas(count: number): Persona[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `persona-${i}`,
    name: `P${i}`,
    expertise: `E${i}`,
    perspective: `V${i}`,
    color: "white",
    model: "claude-sonnet-4-20250514",
  }));
}

function makeContext(overrides?: Partial<RoundContext>): RoundContext {
  return {
    topic: "test topic",
    persona: makePersonas(1)[0] as Persona,
    allMessages: [],
    ...overrides,
  };
}

// --- getProtocol ---

describe("getProtocol", () => {
  test("returns protocol for each valid type", () => {
    const types = [
      "round-robin",
      "devils-advocate",
      "dialectical",
      "ngt",
      "stepladder",
      "delphi",
    ] as const;
    for (const t of types) {
      const p = getProtocol(t);
      expect(p.type).toBe(t);
      expect(p.name).toBeTruthy();
      expect(typeof p.buildRounds).toBe("function");
    }
  });
});

// --- assignRoles ---

describe("assignRoles", () => {
  const personas = makePersonas(4);

  test("devils-advocate: last persona is devil, rest are advocate", () => {
    const result = assignRoles("devils-advocate", personas);
    expect(result.slice(0, 3).every((p) => p.role === "advocate")).toBe(true);
    expect(result[3]?.role).toBe("devil");
  });

  test("dialectical: splits into team-a and team-b", () => {
    const result = assignRoles("dialectical", personas);
    expect(result[0]?.role).toBe("team-a");
    expect(result[1]?.role).toBe("team-a");
    expect(result[2]?.role).toBe("team-b");
    expect(result[3]?.role).toBe("team-b");
  });

  test("other protocols: no role assigned", () => {
    const result = assignRoles("round-robin", personas);
    expect(result.every((p) => p.role === undefined)).toBe(true);
  });
});

// --- Round Robin ---

describe("roundRobinProtocol", () => {
  const protocol = getProtocol("round-robin");
  const personas = makePersonas(3);

  test("produces 3 rounds", () => {
    const rounds = protocol.buildRounds(personas, "topic");
    expect(rounds).toHaveLength(3);
  });

  test("all personas participate in every round", () => {
    const rounds = protocol.buildRounds(personas, "topic");
    for (const r of rounds) {
      expect(r.participants).toEqual(personas.map((p) => p.id));
    }
  });

  test("round labels are descriptive", () => {
    const rounds = protocol.buildRounds(personas, "topic");
    expect(rounds[0]?.label).toContain("Initial");
    expect(rounds[1]?.label).toContain("Cross");
    expect(rounds[2]?.label).toContain("Final");
  });

  test("promptBuilder includes topic", () => {
    const rounds = protocol.buildRounds(personas, "topic");
    const round = rounds[0];
    expect(round).toBeDefined();
    const prompt = round?.promptBuilder(makeContext({ topic: "AI" }));
    expect(prompt).toContain("AI");
  });
});

// --- Devil's Advocate ---

describe("devilsAdvocateProtocol", () => {
  const protocol = getProtocol("devils-advocate");
  const personas = assignRoles("devils-advocate", makePersonas(3));

  test("produces 3 rounds: proposal, challenge, rebuttal", () => {
    const rounds = protocol.buildRounds(personas, "topic");
    expect(rounds).toHaveLength(3);
    expect(rounds[0]?.type).toBe("proposal");
    expect(rounds[1]?.type).toBe("challenge");
    expect(rounds[2]?.type).toBe("rebuttal");
  });

  test("only advocates in proposal round", () => {
    const rounds = protocol.buildRounds(personas, "topic");
    const advocateIds = personas
      .filter((p) => p.role === "advocate")
      .map((p) => p.id);
    expect(rounds[0]?.participants).toEqual(advocateIds);
  });

  test("only devils in challenge round", () => {
    const rounds = protocol.buildRounds(personas, "topic");
    const devilIds = personas
      .filter((p) => p.role === "devil")
      .map((p) => p.id);
    expect(rounds[1]?.participants).toEqual(devilIds);
  });
});

// --- Dialectical ---

describe("dialecticalProtocol", () => {
  const protocol = getProtocol("dialectical");
  const personas = assignRoles("dialectical", makePersonas(4));

  test("produces 3 rounds: thesis, antithesis, synthesis", () => {
    const rounds = protocol.buildRounds(personas, "topic");
    expect(rounds).toHaveLength(3);
    expect(rounds[0]?.type).toBe("thesis");
    expect(rounds[1]?.type).toBe("antithesis");
    expect(rounds[2]?.type).toBe("synthesis");
  });

  test("team-a in thesis, team-b in antithesis, all in synthesis", () => {
    const rounds = protocol.buildRounds(personas, "topic");
    const teamAIds = personas
      .filter((p) => p.role === "team-a")
      .map((p) => p.id);
    const teamBIds = personas
      .filter((p) => p.role === "team-b")
      .map((p) => p.id);
    expect(rounds[0]?.participants).toEqual(teamAIds);
    expect(rounds[1]?.participants).toEqual(teamBIds);
    expect(rounds[2]?.participants).toEqual(personas.map((p) => p.id));
  });
});

// --- NGT ---

describe("ngtProtocol", () => {
  const protocol = getProtocol("ngt");
  const personas = makePersonas(3);

  test("produces 3 rounds: ideation, sharing, ranking", () => {
    const rounds = protocol.buildRounds(personas, "topic");
    expect(rounds).toHaveLength(3);
    expect(rounds[0]?.type).toBe("ideation");
    expect(rounds[1]?.type).toBe("sharing");
    expect(rounds[2]?.type).toBe("ranking");
  });

  test("all personas in every round", () => {
    const rounds = protocol.buildRounds(personas, "topic");
    for (const r of rounds) {
      expect(r.participants).toEqual(personas.map((p) => p.id));
    }
  });

  test("ideation prompt instructs independent thinking", () => {
    const rounds = protocol.buildRounds(personas, "topic");
    const round = rounds[0];
    expect(round).toBeDefined();
    const prompt = round?.promptBuilder(makeContext());
    expect(prompt).toContain("independently");
  });
});

// --- Stepladder ---

describe("stepladderProtocol", () => {
  const protocol = getProtocol("stepladder");

  test("single persona produces 1 round", () => {
    const rounds = protocol.buildRounds(makePersonas(1), "topic");
    expect(rounds).toHaveLength(1);
  });

  test("2 personas produce 1 core round", () => {
    const personas = makePersonas(2);
    const rounds = protocol.buildRounds(personas, "topic");
    expect(rounds).toHaveLength(1);
    expect(rounds[0]?.type).toBe("core");
    expect(rounds[0]?.participants).toEqual(personas.map((p) => p.id));
  });

  test("4 personas produce core + 2×(entry + integration) = 5 rounds", () => {
    const personas = makePersonas(4);
    const rounds = protocol.buildRounds(personas, "topic");
    expect(rounds).toHaveLength(5);
    expect(rounds[0]?.type).toBe("core");
    expect(rounds[1]?.type).toBe("entry");
    expect(rounds[2]?.type).toBe("integration");
    expect(rounds[3]?.type).toBe("entry");
    expect(rounds[4]?.type).toBe("integration");
  });

  test("entry round has only the new persona", () => {
    const personas = makePersonas(3);
    const rounds = protocol.buildRounds(personas, "topic");
    expect(rounds[1]?.participants).toHaveLength(1);
    expect(rounds[1]?.participants[0]).toBe("persona-2");
  });

  test("integration round includes all existing + new persona", () => {
    const personas = makePersonas(3);
    const rounds = protocol.buildRounds(personas, "topic");
    expect(rounds[2]?.participants).toEqual(personas.map((p) => p.id));
  });
});

// --- Delphi ---

describe("delphiProtocol", () => {
  const protocol = getProtocol("delphi");
  const personas = makePersonas(3);

  test("produces 3 anonymous rounds", () => {
    const rounds = protocol.buildRounds(personas, "topic");
    expect(rounds).toHaveLength(3);
    expect(rounds[0]?.type).toBe("anonymous-r1");
    expect(rounds[1]?.type).toBe("anonymous-r2");
    expect(rounds[2]?.type).toBe("anonymous-r3");
  });

  test("displayPolicy hides names and reveals after summary", () => {
    expect(protocol.displayPolicy.showPersonaName).toBe(false);
    expect(protocol.displayPolicy.showModel).toBe(false);
    expect(protocol.displayPolicy.revealAfterSummary).toBe(true);
  });

  test("R2 prompt uses anonymous labels (Expert N)", () => {
    const rounds = protocol.buildRounds(personas, "topic");
    const ctx = makeContext({
      allMessages: [
        { name: "P0", content: "opinion A" },
        { name: "P1", content: "opinion B" },
      ],
    });
    const round = rounds[1];
    expect(round).toBeDefined();
    const prompt = round?.promptBuilder(ctx);
    expect(prompt).toContain("[Expert 1]");
    expect(prompt).toContain("[Expert 2]");
    expect(prompt).not.toContain("[P0]");
    expect(prompt).not.toContain("[P1]");
  });
});
