# polylogue

Multi-LLM structured debate CLI. Enter a topic, and AI assembles an expert panel with distinct personas to run a structured discussion using deliberation protocols.

## Quick Start

```bash
npx polylogue "AIの未来について"
```

Or install globally:

```bash
npm install -g polylogue
polylogue "Should we adopt microservices?"
```

## Requirements

Set at least one API key as an environment variable:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...       # optional, enables web search personas
```

## Features

- **6 deliberation protocols**: Round Robin, Devil's Advocate, Dialectical Inquiry, Nominal Group Technique, Stepladder, Delphi Method
- **Auto protocol selection**: LLM picks the best protocol for your topic
- **Role-based model assignment**: Each persona gets a model suited to its role (reasoning, creative, web search)
- **Multi-model support**: Claude Sonnet, Claude Haiku, GPT-4o with web search
- **User intervention**: Pause and redirect the discussion at any time (Esc×2)
- **Session transcripts**: Auto-saved as JSONL

## Development

```bash
bun install
bun run dev              # Run the CLI
bun run dev:mock         # Run with mock LLM (no API calls)
bun test                 # Run tests
bun run lint             # Lint (biome)
bun run typecheck        # Type check (tsc)
bun run build            # Build for npm
```

## License

MIT
