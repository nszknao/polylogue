import { render } from "ink";
import { App } from "@/app.tsx";

const arg = process.argv[2];

if (arg === "--version" || arg === "-v") {
  const { version } = await import("../package.json");
  console.log(version);
  process.exit(0);
}

if (arg === "--help" || arg === "-h") {
  console.log(`polylogue — Multi-LLM structured debate CLI

Usage:
  polylogue [topic]         Start a debate on the given topic
  polylogue configure       Re-configure API keys and provider

Options:
  -v, --version             Show version
  -h, --help                Show this help`);
  process.exit(0);
}

const isConfigure = arg === "configure";
const topic = isConfigure ? undefined : arg;

render(<App initialTopic={topic} forceConfigure={isConfigure} />);
