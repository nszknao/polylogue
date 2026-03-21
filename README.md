# polylogue

Multi-LLM structured debate CLI. Enter a topic, and AI assembles an expert panel with distinct personas to run a structured discussion using deliberation protocols.

## Quick Start

```bash
npx polylogue "Should AI systems be open-sourced?"
```

Or install globally:

```bash
npm install -g polylogue
polylogue "Should we adopt microservices?"
```

## Setup

On first run, polylogue will interactively prompt you to choose a primary provider (Anthropic or OpenAI) and enter your API keys. Credentials are saved to `~/.config/polylogue/credentials.json`.

You can reconfigure at any time:

```bash
npx polylogue configure
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
