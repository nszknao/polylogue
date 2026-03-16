import type { Protocol, RoundConfig } from "@/types.ts";

export const devilsAdvocateProtocol: Protocol = {
  type: "devils-advocate",
  name: "Devil's Advocate",
  description:
    "One persona systematically challenges all ideas to stress-test proposals",
  displayPolicy: {
    showPersonaName: true,
    showModel: true,
    revealAfterSummary: false,
  },
  contextStrategy: "full",
  buildRounds(personas, _topic): RoundConfig[] {
    const advocates = personas
      .filter((p) => p.role === "advocate")
      .map((p) => p.id);
    const devils = personas.filter((p) => p.role === "devil").map((p) => p.id);

    return [
      {
        label: "Advocate proposals",
        type: "proposal",
        participants: advocates,
        promptBuilder: (ctx) =>
          `Present your proposal or position on the following topic. Make a strong case.\n\nTopic: ${ctx.topic}\n\nBe concise (under 300 characters) and specific.`,
      },
      {
        label: "Devil's advocate challenge",
        type: "challenge",
        participants: devils,
        promptBuilder: (ctx) => {
          const context = ctx.allMessages
            .map((m) => `[${m.name}] ${m.content}`)
            .join("\n\n");
          return `You are the devil's advocate. Systematically challenge and critique the proposals below. Find weaknesses, risks, and flawed assumptions.\n\nTopic: ${ctx.topic}\n\n--- Proposals ---\n${context}\n---\n\nBe rigorous and specific in your critique (under 400 characters).`;
        },
      },
      {
        label: "Advocate rebuttal",
        type: "rebuttal",
        participants: advocates,
        promptBuilder: (ctx) => {
          const context = ctx.allMessages
            .map((m) => `[${m.name}] ${m.content}`)
            .join("\n\n");
          return `Respond to the devil's advocate critique. Defend your position, acknowledge valid points, and refine your proposal.\n\nTopic: ${ctx.topic}\n\n--- Discussion so far ---\n${context}\n---\n\nBe concise (under 300 characters).`;
        },
      },
    ];
  },
};
