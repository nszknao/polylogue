import { PasswordInput } from "@inkjs/ui";
import { Box, Text, useInput } from "ink";
import { useState } from "react";
import {
  loadCredentials,
  type Provider,
  saveCredentials,
} from "@/lib/credentials.ts";

type Props = {
  onComplete: () => void;
};

type Step = "provider" | "primary-key" | "secondary-key" | "done";

const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI (GPT)",
};

const OTHER_PROVIDER: Record<Provider, Provider> = {
  anthropic: "openai",
  openai: "anthropic",
};

export function ApiKeySetup({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("provider");
  const [selected, setSelected] = useState<0 | 1>(0);
  const [primary, setPrimary] = useState<Provider>("anthropic");
  const [primaryKey, setPrimaryKey] = useState("");

  useInput((_input, key) => {
    if (step !== "provider") return;
    if (key.upArrow || key.downArrow) {
      setSelected((prev) => (prev === 0 ? 1 : 0));
    }
    if (key.return) {
      const provider = selected === 0 ? "anthropic" : "openai";
      setPrimary(provider);
      setStep("primary-key");
    }
  });

  const handlePrimarySubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setPrimaryKey(trimmed);
    setStep("secondary-key");
  };

  const handleSecondarySubmit = (value: string) => {
    const trimmed = value.trim();
    const existing = loadCredentials();
    const secondary = OTHER_PROVIDER[primary];
    saveCredentials({
      ...existing,
      primaryProvider: primary,
      [`${primary}ApiKey`]: primaryKey,
      ...(trimmed ? { [`${secondary}ApiKey`]: trimmed } : {}),
    });
    setStep("done");
    onComplete();
  };

  const providers: Provider[] = ["anthropic", "openai"];
  const secondary = OTHER_PROVIDER[primary];

  return (
    <Box flexDirection="column">
      <Text>No API keys configured. Let's set them up.</Text>
      <Text color="gray">Saved to ~/.config/polylogue/credentials.json</Text>
      <Box marginTop={1} flexDirection="column">
        {step === "provider" && (
          <Box flexDirection="column">
            <Text>Select your primary provider:</Text>
            {providers.map((p, i) => (
              <Text key={p}>
                <Text color={selected === i ? "green" : "gray"}>
                  {selected === i ? "❯ " : "  "}
                </Text>
                {PROVIDER_LABELS[p]}
              </Text>
            ))}
          </Box>
        )}
        {step === "primary-key" && (
          <Box flexDirection="column">
            <Text>{PROVIDER_LABELS[primary]} API Key (required):</Text>
            <Box>
              <Text color="green">❯ </Text>
              <PasswordInput onSubmit={handlePrimarySubmit} />
            </Box>
          </Box>
        )}
        {step === "secondary-key" && (
          <Box flexDirection="column">
            <Text>
              {PROVIDER_LABELS[secondary]} API Key (optional — press Enter to
              skip):
            </Text>
            <Box>
              <Text color="green">❯ </Text>
              <PasswordInput onSubmit={handleSecondarySubmit} />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
