/**
 * Mock dev server — runs the full TUI without LLM API calls.
 * Usage: bun e2e/dev.tsx [topic]
 */
import { mock } from "bun:test";
import { MockLLMClient } from "./mock-llm-client.ts";

const client = new MockLLMClient();
mock.module("@/lib/llm-client.ts", () => ({
  getLLMClient: () => client,
}));

const { render } = await import("ink");
const { App } = await import("@/app.tsx");

const topic = process.argv[2];
render(<App initialTopic={topic} />);
