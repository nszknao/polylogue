import { config } from "@/config.ts";
import { getLLMClient } from "@/lib/llm-client.ts";
import {
  buildFollowUpRoundPrompt,
  buildInterventionJudgmentPrompt,
  buildModeratorPrompt,
  buildSummaryPrompt,
  buildSystemPrompt,
} from "@/lib/prompts.ts";
import { getProtocol } from "@/lib/protocols/index.ts";
import { withRetry } from "@/lib/retry.ts";
import { Transcript } from "@/lib/transcript.ts";
import type {
  Message,
  Persona,
  ProtocolType,
  Round,
  RoundConfig,
} from "@/types.ts";

export type OrchestratorEvent =
  | { type: "round-start"; round: number; label: string }
  | { type: "message-start"; personaId: string }
  | { type: "message-chunk"; personaId: string; chunk: string }
  | { type: "message-end"; personaId: string; content: string; round: number }
  | { type: "moderator-start" }
  | { type: "moderator-end"; content: string }
  | { type: "summary-start" }
  | { type: "summary-end"; content: string }
  | { type: "awaiting-intervention" }
  | { type: "intervention-judged"; action: string; direction: string }
  | { type: "complete"; rounds: Round[]; summary: string }
  | { type: "interrupted"; rounds: Round[] };

type EventHandler = (event: OrchestratorEvent) => void;

type InterventionResult = {
  action: "inject" | "add_round";
  direction: string;
};

export class Orchestrator {
  private paused = false;
  private pausePromise: Promise<void> | null = null;
  private pauseResolve: (() => void) | null = null;
  private aborted = false;
  private userDirection: string | null = null;
  private interventionResolve: ((msg: string | null) => void) | null = null;

  pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.pausePromise = new Promise((resolve) => {
      this.pauseResolve = resolve;
    });
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.pauseResolve?.();
    this.pausePromise = null;
    this.pauseResolve = null;
  }

  abort(): void {
    this.aborted = true;
    this.resume();
    this.interventionResolve?.(null);
  }

  setUserDirection(message: string): void {
    this.userDirection = message;
  }

  submitIntervention(message: string): void {
    this.interventionResolve?.(message);
    this.interventionResolve = null;
  }

  isPaused(): boolean {
    return this.paused;
  }

  private consumeUserDirection(): string | null {
    const d = this.userDirection;
    this.userDirection = null;
    return d;
  }

  private async checkpoint(): Promise<void> {
    if (this.pausePromise) {
      await this.pausePromise;
    }
  }

  private async waitForIntervention(
    onEvent?: EventHandler,
  ): Promise<string | null> {
    return new Promise((resolve) => {
      this.interventionResolve = resolve;
      onEvent?.({ type: "awaiting-intervention" });
    });
  }

  private async callLLM(
    persona: Persona,
    userPrompt: string,
    roundNum: number,
    onEvent: EventHandler,
  ): Promise<string> {
    return withRetry(async () => {
      const client = getLLMClient(persona.model);
      onEvent({ type: "message-start", personaId: persona.id });

      let full = "";
      for await (const event of client.stream({
        model: persona.model,
        system: buildSystemPrompt(persona),
        userPrompt,
        maxTokens: 1024,
        tools: persona.tools,
      })) {
        full += event.text;
        onEvent({
          type: "message-chunk",
          personaId: persona.id,
          chunk: event.text,
        });
      }

      onEvent({
        type: "message-end",
        personaId: persona.id,
        content: full,
        round: roundNum,
      });
      return full;
    });
  }

  private async callModeratorLLM(
    prompt: string,
    onEvent: EventHandler,
  ): Promise<string> {
    return withRetry(async () => {
      const client = getLLMClient(config.defaultModel);
      onEvent({ type: "moderator-start" });
      const text = await client.generate({
        model: config.defaultModel,
        system: "",
        userPrompt: prompt,
        maxTokens: 1024,
      });
      onEvent({ type: "moderator-end", content: text });
      return text;
    });
  }

  private async judgeIntervention(
    topic: string,
    messages: Array<{ name: string; content: string }>,
    userMessage: string,
  ): Promise<InterventionResult> {
    return withRetry(async () => {
      const client = getLLMClient(config.defaultModel);
      const text = await client.generate({
        model: config.defaultModel,
        system: "",
        userPrompt: buildInterventionJudgmentPrompt(
          topic,
          messages,
          userMessage,
        ),
        maxTokens: 256,
      });

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch)
        return { action: "inject" as const, direction: userMessage };

      const raw = JSON.parse(jsonMatch[0]) as {
        action: string;
        direction: string;
      };

      if (raw.action === "add_round" || raw.action === "inject") {
        return {
          action: raw.action as "inject" | "add_round",
          direction: raw.direction || userMessage,
        };
      }
      return { action: "inject" as const, direction: userMessage };
    });
  }

  private buildPromptWithDirection(
    basePrompt: string,
    direction: string | null,
  ): string {
    if (!direction) return basePrompt;
    return `${basePrompt}\n\n--- User direction ---\n${direction}\n---\nIncorporate this direction into your response.`;
  }

  private async generateSummary(
    topic: string,
    allMessages: Array<{ name: string; content: string }>,
    transcript: Transcript,
    onEvent: EventHandler,
  ): Promise<string> {
    onEvent({ type: "summary-start" });
    const text = await withRetry(async () => {
      const client = getLLMClient(config.defaultModel);
      return client.generate({
        model: config.defaultModel,
        system: "",
        userPrompt: buildSummaryPrompt(topic, allMessages),
        maxTokens: 2048,
      });
    });

    await transcript.append({
      type: "summary",
      content: text,
      timestamp: Date.now(),
    });

    onEvent({ type: "summary-end", content: text });
    return text;
  }

  async run(
    topic: string,
    personas: Persona[],
    protocolType: ProtocolType,
    onEvent: EventHandler,
  ): Promise<{ rounds: Round[]; summary: string }> {
    const protocol = getProtocol(protocolType);
    const roundConfigs = protocol.buildRounds(personas, topic);
    const transcript = new Transcript(config.sessionDir, topic);
    await transcript.init();

    await transcript.append({
      type: "session_start",
      sessionId: transcript.sessionId,
      topic,
      protocol: protocolType,
      timestamp: Date.now(),
    });
    await transcript.append({
      type: "personas_ready",
      personas,
      timestamp: Date.now(),
    });

    const allMessages: Array<{ name: string; content: string }> = [];
    const rounds: Round[] = [];
    let nextRoundNum = 1;
    let moderatorSummary: string | undefined;
    const personaMap = new Map(personas.map((p) => [p.id, p]));

    const runRound = async (roundConfig: RoundConfig): Promise<boolean> => {
      const roundNum = nextRoundNum++;
      onEvent({
        type: "round-start",
        round: roundNum,
        label: roundConfig.label,
      });
      await transcript.append({
        type: "round_start",
        round: roundNum,
        label: roundConfig.label,
        timestamp: Date.now(),
      });

      const participants = roundConfig.participants
        .map((id) => personaMap.get(id))
        .filter((p): p is Persona => p !== undefined);

      await this.checkpoint();
      if (this.aborted) return false;

      const direction = this.consumeUserDirection();
      if (direction) {
        await transcript.append({
          type: "user_direction",
          content: direction,
          timestamp: Date.now(),
        });
      }

      // Build prompts for all participants with the same snapshot of allMessages
      const tasks = participants.map((persona) => {
        const basePrompt = roundConfig.promptBuilder({
          topic,
          persona,
          allMessages,
          moderatorSummary,
        });
        const prompt = this.buildPromptWithDirection(basePrompt, direction);
        return { persona, prompt };
      });

      // Execute all persona calls in parallel
      const results = await Promise.allSettled(
        tasks.map(async ({ persona, prompt }) => {
          const content = await this.callLLM(
            persona,
            prompt,
            roundNum,
            onEvent,
          );
          return { persona, content };
        }),
      );

      const messages: Message[] = [];
      // results and tasks share the same index — tasks[i] is the input for results[i]
      for (const [idx, result] of results.entries()) {
        if (result.status === "fulfilled") {
          const { persona, content } = result.value;
          messages.push({
            personaId: persona.id,
            round: roundNum,
            content,
            timestamp: Date.now(),
          });
          allMessages.push({ name: persona.name, content });
          await transcript.append({
            type: "message",
            round: roundNum,
            personaId: persona.id,
            personaName: persona.name,
            content,
            timestamp: Date.now(),
          });
        } else {
          const persona = tasks[idx]?.persona;
          if (persona) {
            const failNote = `[${persona.name}: response unavailable]`;
            allMessages.push({ name: persona.name, content: failNote });
            onEvent({
              type: "message-end",
              personaId: persona.id,
              content: failNote,
              round: roundNum,
            });
          }
        }
      }

      rounds.push({
        number: roundNum,
        type: roundConfig.type,
        messages,
      });
      return true;
    };

    const interruptSession = async (): Promise<{
      rounds: Round[];
      summary: string;
    }> => {
      await transcript.append({
        type: "session_interrupted",
        reason: "user_abort",
        timestamp: Date.now(),
      });
      onEvent({ type: "interrupted", rounds });
      return { rounds, summary: "" };
    };

    // Execute protocol rounds
    for (const roundConfig of roundConfigs) {
      if (!(await runRound(roundConfig))) return interruptSession();

      // Run moderator after the second-to-last round
      if (roundConfig === roundConfigs[roundConfigs.length - 2]) {
        await this.checkpoint();
        if (this.aborted) return interruptSession();

        moderatorSummary = await this.callModeratorLLM(
          buildModeratorPrompt(topic, allMessages),
          onEvent,
        );
        await transcript.append({
          type: "moderator",
          content: moderatorSummary,
          timestamp: Date.now(),
        });
      }
    }

    // Summary + intervention loop
    let lastSummary = await this.generateSummary(
      topic,
      allMessages,
      transcript,
      onEvent,
    );

    while (!this.aborted) {
      const userMessage = await this.waitForIntervention(onEvent);

      if (userMessage === null || this.aborted) break;

      const judgment = await this.judgeIntervention(
        topic,
        allMessages,
        userMessage,
      );

      onEvent({
        type: "intervention-judged",
        action: judgment.action,
        direction: judgment.direction,
      });

      await transcript.append({
        type: "user_direction",
        content: userMessage,
        timestamp: Date.now(),
      });

      if (judgment.action === "inject") {
        // Lightweight: queue direction for the next round's prompts
        this.setUserDirection(judgment.direction);
      } else {
        // add_round: run a full follow-up round with all personas
        const followUpConfig: RoundConfig = {
          label: "Follow-up discussion",
          type: "follow-up",
          participants: personas.map((p) => p.id),
          promptBuilder: (ctx) =>
            buildFollowUpRoundPrompt(
              ctx.topic,
              ctx.allMessages,
              judgment.direction,
            ),
        };

        if (!(await runRound(followUpConfig))) break;

        lastSummary = await this.generateSummary(
          topic,
          allMessages,
          transcript,
          onEvent,
        );
      }
    }

    await transcript.append({
      type: "session_complete",
      timestamp: Date.now(),
    });

    onEvent({
      type: "complete",
      rounds,
      summary: lastSummary,
    });

    return { rounds, summary: lastSummary };
  }
}
