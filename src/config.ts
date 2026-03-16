export const config = {
  defaultModel: "claude-sonnet-4-20250514",
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
  sessionDir: ".quorum/sessions",
} as const;
