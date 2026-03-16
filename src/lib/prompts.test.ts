import { describe, expect, test } from "bun:test";
import {
  buildFollowUpRoundPrompt,
  buildModeratorPrompt,
  buildSummaryPrompt,
  buildSystemPrompt,
} from "@/lib/prompts.ts";

describe("buildSystemPrompt", () => {
  test("includes persona details", () => {
    const prompt = buildSystemPrompt({
      name: "Alice",
      expertise: "AI",
      perspective: "optimist",
    });
    expect(prompt).toContain("Alice");
    expect(prompt).toContain("AI");
    expect(prompt).toContain("optimist");
  });

  test("instructs to reply in same language as topic", () => {
    const prompt = buildSystemPrompt({
      name: "X",
      expertise: "E",
      perspective: "P",
    });
    expect(prompt).toContain("same language as the topic");
  });
});

describe("buildModeratorPrompt", () => {
  test("includes all messages", () => {
    const messages = [{ name: "Alice", content: "point A" }];
    const prompt = buildModeratorPrompt("topic", messages);
    expect(prompt).toContain("[Alice] point A");
  });
});

describe("buildSummaryPrompt", () => {
  test("includes all messages and format instructions", () => {
    const messages = [{ name: "Alice", content: "conclusion" }];
    const prompt = buildSummaryPrompt("topic", messages);
    expect(prompt).toContain("[Alice] conclusion");
    expect(prompt).toContain("## Discussion summary");
    expect(prompt).toContain("## Recommended action items");
  });
});

describe("buildFollowUpRoundPrompt", () => {
  test("includes direction and recent messages", () => {
    const messages = [{ name: "Alice", content: "earlier point" }];
    const prompt = buildFollowUpRoundPrompt(
      "topic",
      messages,
      "focus on risks",
    );
    expect(prompt).toContain("[Alice] earlier point");
    expect(prompt).toContain("focus on risks");
  });

  test("limits to last 10 messages", () => {
    const messages = Array.from({ length: 15 }, (_, i) => ({
      name: `P${i}`,
      content: `msg${i}`,
    }));
    const prompt = buildFollowUpRoundPrompt("topic", messages, "direction");
    expect(prompt).not.toContain("[P0]");
    expect(prompt).toContain("[P5]");
    expect(prompt).toContain("[P14]");
  });
});
