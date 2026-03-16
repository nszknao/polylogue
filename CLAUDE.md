# Quorum

Multi-LLM structured debate CLI. Bun + TypeScript + Ink (React for Terminal).

## Commands

```bash
bun run dev              # Run the CLI
bun run dev -- "topic"   # Run with a topic argument
bun run lint             # Lint and format (biome)
bun run typecheck        # Type check (tsc)
bun run check            # Lint check without auto-fix
bun test                 # Run tests
```

## Architecture

- `src/cli.tsx` — Entry point
- `src/app.tsx` — Screen transitions (topic → personas → session)
- `src/components/` — Ink TUI components (flat structure)
- `src/lib/` — UI-independent core logic (Ink-free)
  - `orchestrator.ts` — Round control, pause/resume/abort, intervention judgment
  - `prompts.ts` — All prompt templates
  - `transcript.ts` — JSONL session persistence
  - `casting.ts` — Persona auto-generation
  - `protocols/` — Deliberation protocol definitions (Phase 2)
- `src/types.ts` — Type definitions
- `src/config.ts` — Configuration

## Testing

- `bun test` — unit tests + e2e tests
- `bun run dev:mock` — interactive TUI with mock LLM (no API calls)
- e2e tests are in `e2e/` and use `mock.module` to replace `@/lib/llm-client.ts`

## Conventions

- Use `@/` path alias for `src/` imports
- Use Bun runtime, not Node.js
- Bun auto-loads `.env` — no dotenv
- Biome for linting/formatting
- UI labels and prompt instructions in English; LLM responses match the topic's language

## Coding guidelines

- Avoid workarounds (setTimeout(0), indexOf on allSettled results, etc.) — if a workaround is unavoidable, add a comment explaining why
- Async event ordering: when emitting an event that handlers may respond to synchronously, ensure state (e.g. promise resolvers) is set up before the event fires
- All async operations that can fail must have error handling surfaced to the user, not silently swallowed

## Workflow

- Always update docs/design first, then plan, then implement
- Run `bun run lint && bun run typecheck` after changes
- Run `bun test` to verify tests pass
