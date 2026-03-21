import { getPrimaryProvider } from "@/lib/credentials.ts";

const DEFAULT_MODELS = {
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
} as const;

export const config = {
  get defaultModel() {
    return DEFAULT_MODELS[getPrimaryProvider()];
  },
  maxFollowUps: 5,
  maxSessionTokens: 200_000,
  retry: {
    maxAttempts: 3,
    baseDelayMs: 1_000,
    maxDelayMs: 10_000,
  },
  maxConcurrency: {
    anthropic: 5,
    openai: 10,
  },
  sessionDir: ".polylogue/sessions",
} as const;
