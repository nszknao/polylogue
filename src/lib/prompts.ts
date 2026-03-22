export function buildProtocolSelectionPrompt(topic: string): string {
  return `You are a facilitation expert. Select the best deliberation protocol for the given topic.

Topic: ${topic}

Available protocols:
- round-robin: Each persona speaks in turn across multiple rounds. Best for general brainstorming and broad exploration.
- devils-advocate: One persona systematically challenges all ideas. Best for stress-testing a specific proposal.
- dialectical: Thesis vs antithesis to reach synthesis. Best for topics with clear opposing viewpoints.
- ngt: Silent ideation followed by structured sharing and voting. Best for generating many diverse ideas without groupthink.
- stepladder: Personas join the discussion one by one. Best for ensuring each voice is heard equally.
- delphi: Anonymous multi-round convergence. Best for forecasting or reaching consensus on uncertain topics.

Write the "reason" in the same language as the topic.
Output only a JSON object (no other text):
{"protocol": "<protocol-name>", "reason": "<one sentence reason>"}`;
}

export function buildPersonaGenerationPrompt(topic: string): string {
  return `You are a casting director assembling an expert panel for brainstorming business ideas.

Generate 3-5 expert personas best suited to discuss the following topic.

Topic: ${topic}

Requirements:
- Each persona must have a distinct area of expertise and perspective
- At least one persona must hold a critical/skeptical viewpoint
- Use Japanese role names
- Assign each persona a model_category based on their role:
  - "web_search": needs real-time external data (market research, competitive analysis, current trends)
  - "reasoning": needs strong logical/analytical capability (risk assessment, technical evaluation, critical analysis)
  - "creative": idea generation, brainstorming, divergent thinking

Output only the following JSON array (no other text):
[
  {
    "name": "Role name",
    "expertise": "Area of expertise",
    "perspective": "Stance/viewpoint in the discussion",
    "model_category": "web_search" | "reasoning" | "creative"
  }
]`;
}

export function buildSystemPrompt(persona: {
  name: string;
  expertise: string;
  perspective: string;
}): string {
  return `You are "${persona.name}".
Expertise: ${persona.expertise}
Perspective: ${persona.perspective}

Participate in the discussion based on this expertise and perspective. Be concise and specific.
Always reply in the same language as the topic.`;
}

export function buildModeratorPrompt(
  topic: string,
  messages: Array<{ name: string; content: string }>,
): string {
  const context = messages.map((m) => `[${m.name}] ${m.content}`).join("\n\n");

  return `Organize the discussion points below.

Topic: ${topic}

--- Discussion ---
${context}
---

Reply in the same language as the topic. Summarize concisely in the following format:
- Key areas of agreement
- Points of contention
- Unresolved questions`;
}

export function buildSummaryPrompt(
  topic: string,
  allMessages: Array<{ name: string; content: string }>,
): string {
  const context = allMessages
    .map((m) => `[${m.name}] ${m.content}`)
    .join("\n\n");

  return `Summarize the following discussion.

Topic: ${topic}

--- Full discussion ---
${context}
---

Reply in the same language as the topic. Summarize in the following format:
## Discussion summary
## Key areas of agreement
## Remaining issues and risks
## Recommended action items`;
}

export function buildInterventionJudgmentPrompt(
  topic: string,
  messages: Array<{ name: string; content: string }>,
  userMessage: string,
): string {
  const context = messages
    .slice(-10)
    .map((m) => `[${m.name}] ${m.content}`)
    .join("\n\n");

  return `You are a discussion facilitator. A user has intervened in an ongoing panel discussion. Decide the best next action.

Topic: ${topic}

--- Recent discussion (last 10 messages) ---
${context}
---

User's message: "${userMessage}"

Decide ONE action:
- "inject": The user is giving a direction or hint for the next speaker. Inject it into the discussion flow.
- "add_round": The user is raising a new point, question, or topic that warrants a full round of discussion from all panelists.

Output only a JSON object (no other text):
{"action": "inject" | "add_round", "direction": "<rewritten direction for panelists>"}`;
}

export function buildFollowUpRoundPrompt(
  topic: string,
  previousMessages: Array<{ name: string; content: string }>,
  direction: string,
): string {
  const context = previousMessages
    .slice(-10)
    .map((m) => `[${m.name}] ${m.content}`)
    .join("\n\n");

  return `Continue the discussion on the following topic, addressing the new direction from the moderator.

Topic: ${topic}

--- Recent discussion ---
${context}
---

--- New direction ---
${direction}
---

Share your perspective on this new direction concisely (under 300 characters).`;
}
