import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { LLMClient, LLMParams, StreamEvent } from "@/lib/llm-client.ts";
import type { OrchestratorEvent } from "@/lib/orchestrator.ts";
import type { Persona, ProtocolType } from "@/types.ts";

// ---------------------------------------------------------------------------
// Mock LLM client
// ---------------------------------------------------------------------------

class MockLLMClient implements LLMClient {
  calls: { method: string; params: LLMParams }[] = [];
  interventionResponse = '{"action":"add_round","direction":"Explore costs"}';

  async *stream(params: LLMParams): AsyncIterable<StreamEvent> {
    this.calls.push({ method: "stream", params });
    for (const word of `Response from ${params.model}`.split(" ")) {
      yield { type: "text", text: `${word} ` };
    }
  }

  async generate(params: LLMParams): Promise<string> {
    this.calls.push({ method: "generate", params });
    if (params.userPrompt.includes("Organize"))
      return "Agreement on X. Contention on Y.";
    if (params.userPrompt.includes("Summarize"))
      return "## Summary\nKey insights.";
    if (params.userPrompt.includes("facilitator"))
      return this.interventionResponse;
    return "Generic response";
  }
}

let mockClient: MockLLMClient;

mock.module("@/lib/llm-client.ts", () => ({
  getLLMClient: () => mockClient,
}));

const { Orchestrator } = await import("@/lib/orchestrator.ts");
type OrchestratorInstance = InstanceType<typeof Orchestrator>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePersonas(count = 3): Persona[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p-${i}`,
    name: `Expert ${i}`,
    expertise: `Field ${i}`,
    perspective: `View ${i}`,
    color: ["red", "green", "blue"][i % 3] as string,
    model: "claude-sonnet-4-20250514",
  }));
}

function eventsOfType<T extends OrchestratorEvent["type"]>(
  events: OrchestratorEvent[],
  type: T,
): Extract<OrchestratorEvent, { type: T }>[] {
  return events.filter((e) => e.type === type) as Extract<
    OrchestratorEvent,
    { type: T }
  >[];
}

/** Run orchestrator, auto-aborting on awaiting-intervention. */
async function runSession(
  protocol: ProtocolType,
  personas: Persona[],
  opts?: {
    onEvent?: (
      event: OrchestratorEvent,
      allEvents: OrchestratorEvent[],
      orchestrator: OrchestratorInstance,
    ) => void;
  },
) {
  const o = new Orchestrator();
  const events: OrchestratorEvent[] = [];
  const handler = (event: OrchestratorEvent) => {
    events.push(event);
    if (opts?.onEvent) {
      opts.onEvent(event, events, o);
      return;
    }
    // Default: abort on awaiting-intervention
    if (event.type === "awaiting-intervention") {
      o.abort();
    }
  };
  const topic = `${protocol} test`;
  const result = await o.run(topic, personas, protocol, handler);
  return { events, result, orchestrator: o };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockClient = new MockLLMClient();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Orchestrator e2e", () => {
  test("round-robin: full event sequence", async () => {
    const personas = makePersonas(3);
    const { events, result } = await runSession("round-robin", personas);

    const roundStarts = eventsOfType(events, "round-start");
    expect(roundStarts.length).toBeGreaterThanOrEqual(2);
    expect(roundStarts[0]?.round).toBe(1);

    // Each persona speaks per round
    const messageEnds = eventsOfType(events, "message-end");
    expect(messageEnds.length).toBe(personas.length * roundStarts.length);

    // Moderator + summary
    expect(eventsOfType(events, "moderator-start")).toHaveLength(1);
    expect(eventsOfType(events, "moderator-end")).toHaveLength(1);
    expect(eventsOfType(events, "summary-end")).toHaveLength(1);

    expect(result.rounds.length).toBe(roundStarts.length);
    expect(result.summary).toBeTruthy();
  });

  test("abort during round stops immediately", async () => {
    const personas = makePersonas(2);
    const { events, result } = await runSession("round-robin", personas, {
      onEvent: (event, _all, o) => {
        if (event.type === "round-start" && event.round === 1) {
          o.abort();
        }
      },
    });

    expect(eventsOfType(events, "interrupted")).toHaveLength(1);
    expect(eventsOfType(events, "complete")).toHaveLength(0);
    expect(result.summary).toBe("");
  });

  test("pause and resume continues session", async () => {
    const personas = makePersonas(2);
    let pausedOnce = false;

    const { events } = await runSession("round-robin", personas, {
      onEvent: (event, _all, o) => {
        if (event.type === "round-start" && event.round === 1 && !pausedOnce) {
          pausedOnce = true;
          o.pause();
          expect(o.isPaused()).toBe(true);
          // Defer resume so the orchestrator actually awaits the pause promise
          setTimeout(() => o.resume(), 5);
        }
        if (event.type === "awaiting-intervention") {
          o.abort();
        }
      },
    });

    expect(eventsOfType(events, "summary-end").length).toBeGreaterThanOrEqual(1);
  });

  test("user direction is injected into prompts", async () => {
    const personas = makePersonas(2);

    await runSession("round-robin", personas, {
      onEvent: (event, _all, o) => {
        // Set direction before last round
        if (event.type === "moderator-end") {
          o.setUserDirection("Focus on scalability");
        }
        if (event.type === "awaiting-intervention") {
          o.abort();
        }
      },
    });

    const streamCalls = mockClient.calls.filter((c) => c.method === "stream");
    const hasDirection = streamCalls.some((c) =>
      c.params.userPrompt.includes("Focus on scalability"),
    );
    expect(hasDirection).toBe(true);
  });

  test("intervention triggers follow-up round and new summary", async () => {
    const personas = makePersonas(2);

    const { events } = await runSession("round-robin", personas, {
      onEvent: (event, allEvents, o) => {
        if (event.type === "awaiting-intervention") {
          const count = eventsOfType(allEvents, "awaiting-intervention").length;
          if (count === 1) {
            o.submitIntervention("What about costs?");
          } else {
            o.abort();
          }
        }
      },
    });

    expect(eventsOfType(events, "intervention-judged")).toHaveLength(1);

    // Protocol rounds + follow-up round
    const roundStarts = eventsOfType(events, "round-start");
    expect(roundStarts.length).toBeGreaterThanOrEqual(3);

    // Two summaries: initial + after follow-up
    expect(eventsOfType(events, "summary-end").length).toBeGreaterThanOrEqual(2);
  });

  test("inject intervention queues direction without extra round", async () => {
    const personas = makePersonas(2);
    mockClient.interventionResponse =
      '{"action":"inject","direction":"Consider budget constraints"}';

    const { events } = await runSession("round-robin", personas, {
      onEvent: (event, allEvents, o) => {
        if (event.type === "awaiting-intervention") {
          const count = eventsOfType(allEvents, "awaiting-intervention").length;
          if (count === 1) {
            o.submitIntervention("Think about budget");
          } else {
            o.abort();
          }
        }
      },
    });

    expect(eventsOfType(events, "intervention-judged")).toHaveLength(1);
    const judged = eventsOfType(events, "intervention-judged")[0];
    expect(judged?.action).toBe("inject");

    // No follow-up round added — round count stays same as protocol rounds
    const roundStarts = eventsOfType(events, "round-start");
    expect(roundStarts.length).toBe(3); // only protocol rounds

    // Only one summary (no re-summary after inject)
    expect(eventsOfType(events, "summary-end")).toHaveLength(1);
  });

  test("parallel execution: all personas emit messages per round", async () => {
    const personas = makePersonas(4);
    const { events } = await runSession("round-robin", personas);

    const round1Ends = eventsOfType(events, "message-end").filter(
      (e) => e.round === 1,
    );
    expect(round1Ends).toHaveLength(4);
    expect(new Set(round1Ends.map((e) => e.personaId)).size).toBe(4);
  });

  test("streaming emits start → chunk → end per persona", async () => {
    const personas = makePersonas(2);
    const { events } = await runSession("round-robin", personas);

    for (const persona of personas) {
      const starts = eventsOfType(events, "message-start").filter(
        (e) => e.personaId === persona.id,
      );
      const chunks = eventsOfType(events, "message-chunk").filter(
        (e) => e.personaId === persona.id,
      );
      const ends = eventsOfType(events, "message-end").filter(
        (e) => e.personaId === persona.id,
      );
      expect(starts.length).toBeGreaterThanOrEqual(1);
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(ends.length).toBeGreaterThanOrEqual(1);
      for (const end of ends) {
        expect(end.content).toContain("Response");
      }
    }
  });

  test("LLM client receives correct model and system prompt", async () => {
    const personas = makePersonas(2);
    await runSession("round-robin", personas);

    const streamCalls = mockClient.calls.filter((c) => c.method === "stream");
    expect(streamCalls.length).toBeGreaterThan(0);
    for (const call of streamCalls) {
      expect(call.params.model).toBe("claude-sonnet-4-20250514");
      expect(call.params.system).toBeTruthy();
    }

    const generateCalls = mockClient.calls.filter(
      (c) => c.method === "generate",
    );
    expect(generateCalls.length).toBeGreaterThan(0);
  });

  test("rounds contain correct messages in result", async () => {
    const personas = makePersonas(2);
    const { result } = await runSession("round-robin", personas);

    for (const round of result.rounds) {
      expect(round.messages.length).toBe(personas.length);
      for (const msg of round.messages) {
        expect(msg.content).toBeTruthy();
        expect(msg.personaId).toMatch(/^p-\d$/);
        expect(msg.round).toBe(round.number);
      }
    }
  });

  // Protocol coverage
  const protocols: ProtocolType[] = [
    "devils-advocate",
    "dialectical",
    "ngt",
    "stepladder",
    "delphi",
  ];

  for (const protocol of protocols) {
    test(`${protocol}: completes full session`, async () => {
      const personas = makePersonas(4);
      const { events } = await runSession(protocol, personas);

      const roundStarts = eventsOfType(events, "round-start");
      expect(roundStarts.length).toBeGreaterThanOrEqual(2);
      expect(eventsOfType(events, "moderator-end")).toHaveLength(1);
      expect(eventsOfType(events, "summary-end")).toHaveLength(1);
    });
  }
});
