import type { Protocol, RoundConfig } from "@/types.ts";

export const dialecticalProtocol: Protocol = {
  type: "dialectical",
  name: "Dialectical Inquiry",
  description:
    "Two teams argue opposing positions to reach synthesis through structured debate",
  displayPolicy: {
    showPersonaName: true,
    showModel: true,
    revealAfterSummary: false,
  },
  contextStrategy: "full",
  buildRounds(personas, _topic): RoundConfig[] {
    const teamA = personas.filter((p) => p.role === "team-a").map((p) => p.id);
    const teamB = personas.filter((p) => p.role === "team-b").map((p) => p.id);
    const allIds = personas.map((p) => p.id);

    return [
      {
        label: "Team A thesis",
        type: "thesis",
        participants: teamA,
        promptBuilder: (ctx) =>
          `You are on Team A. Present your thesis — a strong position on the following topic.\n\nTopic: ${ctx.topic}\n\nBe concise (under 300 characters) and specific.`,
      },
      {
        label: "Team B antithesis",
        type: "antithesis",
        participants: teamB,
        promptBuilder: (ctx) => {
          const context = ctx.allMessages
            .map((m) => `[${m.name}] ${m.content}`)
            .join("\n\n");
          return `You are on Team B. Present your antithesis — challenge Team A's position and argue the opposing view.\n\nTopic: ${ctx.topic}\n\n--- Team A's thesis ---\n${context}\n---\n\nBe concise (under 300 characters) and specific.`;
        },
      },
      {
        label: "Open synthesis",
        type: "synthesis",
        participants: allIds,
        promptBuilder: (ctx) => {
          const context = ctx.allMessages
            .map((m) => `[${m.name}] ${m.content}`)
            .join("\n\n");
          return `Both teams have presented their positions. Now synthesize — find common ground, acknowledge valid opposing points, and propose a path forward.\n\nTopic: ${ctx.topic}\n\n--- Debate so far ---\n${context}\n---\n\nBe concise (under 300 characters).`;
        },
      },
    ];
  },
};
