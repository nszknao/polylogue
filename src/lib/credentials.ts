import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const CREDENTIALS_PATH = join(
  homedir(),
  ".config",
  "polylogue",
  "credentials.json",
);

export type Credentials = {
  anthropicApiKey?: string;
  openaiApiKey?: string;
};

export function loadCredentials(): Credentials {
  try {
    if (!existsSync(CREDENTIALS_PATH)) return {};
    return JSON.parse(readFileSync(CREDENTIALS_PATH, "utf-8"));
  } catch {
    return {};
  }
}

export function saveCredentials(credentials: Credentials): void {
  const dir = dirname(CREDENTIALS_PATH);
  mkdirSync(dir, { recursive: true });
  writeFileSync(CREDENTIALS_PATH, `${JSON.stringify(credentials, null, 2)}\n`);
}

export function getApiKey(
  provider: "anthropic" | "openai",
): string | undefined {
  if (provider === "anthropic") {
    return process.env.ANTHROPIC_API_KEY ?? loadCredentials().anthropicApiKey;
  }
  return process.env.OPENAI_API_KEY ?? loadCredentials().openaiApiKey;
}

export function hasRequiredKeys(): boolean {
  return getApiKey("anthropic") !== undefined;
}
