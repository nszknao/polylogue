import type { Protocol, RoundConfig } from "@/types.ts";

export const delphiProtocol: Protocol = {
  type: "delphi",
  name: "Delphi Method",
  description:
    "Anonymous multi-round convergence for forecasting and consensus building",
  displayPolicy: {
    showPersonaName: false,
    showModel: false,
    revealAfterSummary: true,
  },
  contextStrategy: "summary",
  buildRounds(personas, _topic): RoundConfig[] {
    const allIds = personas.map((p) => p.id);

    return [
      {
        label: "Round 1: Anonymous opinions",
        type: "anonymous-r1",
        participants: allIds,
        promptBuilder: (ctx) =>
          `Share your expert opinion on the following topic anonymously. Other panelists will not know who said what.\n\nTopic: ${ctx.topic}\n\nBe concise (under 300 characters) and specific.`,
      },
      {
        label: "Round 2: Revised opinions",
        type: "anonymous-r2",
        participants: allIds,
        promptBuilder: (ctx) => {
          const context = ctx.allMessages
            .map((m, i) => `[Expert ${i + 1}] ${m.content}`)
            .join("\n\n");
          return `Review the anonymous opinions below and revise your position. You may maintain, modify, or change your stance.\n\nTopic: ${ctx.topic}\n\n--- Anonymous opinions ---\n${context}\n---\n\nExplain any changes to your position. Be concise (under 300 characters).`;
        },
      },
      {
        label: "Round 3: Final convergence",
        type: "anonymous-r3",
        participants: allIds,
        promptBuilder: (ctx) => {
          const context = ctx.allMessages
            .map((m, i) => `[Expert ${i + 1}] ${m.content}`)
            .join("\n\n");
          return `This is the final round. Review all revised opinions and state your final position. Note areas of consensus and remaining disagreements.\n\nTopic: ${ctx.topic}\n\n--- All opinions ---\n${context}\n---\n\nBe concise (under 300 characters).`;
        },
      },
    ];
  },
};
