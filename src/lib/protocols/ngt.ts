import type { Protocol, RoundConfig } from "@/types.ts";

export const ngtProtocol: Protocol = {
  type: "ngt",
  name: "Nominal Group Technique",
  description:
    "Silent ideation followed by structured sharing and evaluation to generate diverse ideas",
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
        label: "Silent ideation",
        type: "ideation",
        participants: allIds,
        promptBuilder: (ctx) =>
          `Generate your ideas independently on the following topic. List 2-3 distinct ideas with brief explanations. Do NOT consider what others might say.\n\nTopic: ${ctx.topic}\n\nBe concise and specific.`,
      },
      {
        label: "Sharing and discussion",
        type: "sharing",
        participants: allIds,
        promptBuilder: (ctx) => {
          const context = ctx.allMessages
            .map((m) => `[${m.name}] ${m.content}`)
            .join("\n\n");
          return `Review all shared ideas below. Ask clarifying questions, build on ideas you find promising, and identify potential combinations.\n\nTopic: ${ctx.topic}\n\n--- All ideas ---\n${context}\n---\n\nBe concise (under 300 characters).`;
        },
      },
      {
        label: "Evaluation and ranking",
        type: "ranking",
        participants: allIds,
        promptBuilder: (ctx) => {
          const context = ctx.allMessages
            .map((m) => `[${m.name}] ${m.content}`)
            .join("\n\n");
          return `Based on the discussion, rank your top 3 ideas from all proposals. Briefly justify each ranking.\n\nTopic: ${ctx.topic}\n\n--- Discussion ---\n${context}\n---\n\nBe concise (under 300 characters).`;
        },
      },
    ];
  },
};
