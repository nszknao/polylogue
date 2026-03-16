import type { Protocol, RoundConfig } from "@/types.ts";

export const stepladderProtocol: Protocol = {
  type: "stepladder",
  name: "Stepladder",
  description:
    "Personas join the discussion one by one, ensuring each voice is heard independently",
  displayPolicy: {
    showPersonaName: true,
    showModel: true,
    revealAfterSummary: false,
  },
  contextStrategy: "last-speaker-only",
  buildRounds(personas, _topic): RoundConfig[] {
    if (personas.length < 2) {
      return [
        {
          label: "Initial opinion",
          type: "initial",
          participants: personas.map((p) => p.id),
          promptBuilder: (ctx) =>
            `Share your expert opinion on the following topic.\n\nTopic: ${ctx.topic}\n\nBe concise (under 300 characters).`,
        },
      ];
    }

    const rounds: RoundConfig[] = [];

    const first = personas[0];
    const second = personas[1];
    if (!first || !second) return rounds;

    // Round 1: First two personas discuss
    rounds.push({
      label: "Core pair discussion",
      type: "core",
      participants: [first.id, second.id],
      promptBuilder: (ctx) =>
        `Share your expert opinion on the following topic.\n\nTopic: ${ctx.topic}\n\nBe concise (under 300 characters) and specific.`,
    });

    // Subsequent rounds: Add one persona at a time
    for (let i = 2; i < personas.length; i++) {
      const newPersona = personas[i];
      if (!newPersona) continue;
      const existingIds = personas.slice(0, i).map((p) => p.id);

      // New member shares independent view first
      rounds.push({
        label: `${newPersona.name} joins`,
        type: "entry",
        participants: [newPersona.id],
        promptBuilder: (ctx) =>
          `You are joining an ongoing discussion. First, share your independent opinion BEFORE hearing the group's discussion.\n\nTopic: ${ctx.topic}\n\nBe concise (under 300 characters) and specific.`,
      });

      // Then existing members + new member integrate
      rounds.push({
        label: `Integration with ${newPersona.name}`,
        type: "integration",
        participants: [...existingIds, newPersona.id],
        promptBuilder: (ctx) => {
          const recent = ctx.allMessages.slice(-3);
          const context = recent
            .map((m) => `[${m.name}] ${m.content}`)
            .join("\n\n");
          return `A new member has joined the discussion. Integrate their perspective with the group's current thinking.\n\nTopic: ${ctx.topic}\n\n--- Recent discussion ---\n${context}\n---\n\nBe concise (under 300 characters).`;
        },
      });
    }

    return rounds;
  },
};
