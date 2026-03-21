import { PasswordInput } from "@inkjs/ui";
import { Box, Text } from "ink";
import { useState } from "react";
import { loadCredentials, saveCredentials } from "@/lib/credentials.ts";

type Props = {
  onComplete: () => void;
};

type Step = "anthropic" | "openai" | "done";

export function ApiKeySetup({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("anthropic");
  const [anthropicKey, setAnthropicKey] = useState("");

  const handleAnthropicSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setAnthropicKey(trimmed);
    setStep("openai");
  };

  const handleOpenAISubmit = (value: string) => {
    const trimmed = value.trim();
    const existing = loadCredentials();
    saveCredentials({
      ...existing,
      anthropicApiKey: anthropicKey,
      ...(trimmed ? { openaiApiKey: trimmed } : {}),
    });
    setStep("done");
    onComplete();
  };

  return (
    <Box flexDirection="column">
      <Text>No API keys configured. Let's set them up.</Text>
      <Text color="gray">Saved to ~/.config/polylogue/credentials.json</Text>
      <Box marginTop={1} flexDirection="column">
        {step === "anthropic" && (
          <Box flexDirection="column">
            <Text>Anthropic API Key (required):</Text>
            <Box>
              <Text color="green">❯ </Text>
              <PasswordInput onSubmit={handleAnthropicSubmit} />
            </Box>
          </Box>
        )}
        {step === "openai" && (
          <Box flexDirection="column">
            <Text>
              OpenAI API Key (optional, enables web search — press Enter to
              skip):
            </Text>
            <Box>
              <Text color="green">❯ </Text>
              <PasswordInput onSubmit={handleOpenAISubmit} />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
