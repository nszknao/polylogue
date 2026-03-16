import type { Protocol, RoundConfig } from "@/types.ts";

export const roundRobinProtocol: Protocol = {
  type: "round-robin",
  name: "Round Robin",
  description: "Each persona speaks in turn across multiple rounds",
  displayPolicy: {
    showPersonaName: true,
    showModel: true,
    revealAfterSummary: false,
  },
  contextStrategy: "summary",
  buildRounds(personas, _topic): RoundConfig[] {
    const allIds = personas.map((p) => p.id);

    return [
      {
        label: "Initial opinions",
        type: "initial",
        participants: allIds,
        promptBuilder: (ctx) =>
          `Share your expert opinion on the following topic.\n\nTopic: ${ctx.topic}\n\nBe concise (under 300 characters) and specific.`,
      },
      {
        label: "Cross-discussion",
        type: "discussion",
        participants: allIds,
        promptBuilder: (ctx) => {
          const context = ctx.allMessages
            .map((m) => `[${m.name}] ${m.content}`)
            .join("\n\n");
          return `Respond to the other experts' opinions on the following topic.\n\nTopic: ${ctx.topic}\n\n--- Discussion so far ---\n${context}\n---\n\nAgree, disagree, or complement from your perspective. Be concise (under 300 characters).`;
        },
      },
      {
        label: "Final opinions",
        type: "final",
        participants: allIds,
        promptBuilder: (ctx) => {
          return `Share your final opinion on the following topic, considering the discussion and issue summary so far.\n\nTopic: ${ctx.topic}\n\n--- Issue summary ---\n${ctx.moderatorSummary ?? ""}\n---\n\nShare your final opinion concisely (under 300 characters).`;
        },
      },
    ];
  },
};
