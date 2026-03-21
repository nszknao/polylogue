import { Box, Text } from "ink";
import { useState } from "react";
import { ApiKeySetup } from "@/components/api-key-setup.tsx";
import { PersonaList } from "@/components/persona-list.tsx";
import { ProtocolDisplay } from "@/components/protocol-display.tsx";
import { SessionView } from "@/components/session-view.tsx";
import { TopicInput } from "@/components/topic-input.tsx";
import { hasRequiredKeys } from "@/lib/credentials.ts";
import type { Persona, ProtocolType } from "@/types.ts";

type Phase =
  | { step: "setup" }
  | { step: "topic" }
  | { step: "protocol"; topic: string }
  | {
      step: "personas";
      topic: string;
      protocol: ProtocolType;
    }
  | {
      step: "session";
      topic: string;
      protocol: ProtocolType;
      personas: Persona[];
    };

type AppProps = {
  initialTopic?: string;
  forceConfigure?: boolean;
};

export function App({ initialTopic, forceConfigure }: AppProps) {
  const needsSetup = forceConfigure || !hasRequiredKeys();
  const [phase, setPhase] = useState<Phase>(
    needsSetup
      ? { step: "setup" }
      : initialTopic
        ? { step: "protocol", topic: initialTopic }
        : { step: "topic" },
  );

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Polylogue
        </Text>
      </Box>

      {phase.step === "setup" && (
        <ApiKeySetup
          onComplete={() =>
            setPhase(
              initialTopic
                ? { step: "protocol", topic: initialTopic }
                : { step: "topic" },
            )
          }
        />
      )}

      {phase.step === "topic" && (
        <TopicInput
          onSubmit={(topic) => setPhase({ step: "protocol", topic })}
        />
      )}

      {phase.step === "protocol" && (
        <ProtocolDisplay
          topic={phase.topic}
          onConfirm={(protocol) =>
            setPhase({
              step: "personas",
              topic: phase.topic,
              protocol,
            })
          }
        />
      )}

      {phase.step === "personas" && (
        <PersonaList
          topic={phase.topic}
          protocol={phase.protocol}
          onConfirm={(personas) =>
            setPhase({
              step: "session",
              topic: phase.topic,
              protocol: phase.protocol,
              personas,
            })
          }
        />
      )}

      {phase.step === "session" && (
        <SessionView
          topic={phase.topic}
          protocol={phase.protocol}
          personas={phase.personas}
        />
      )}
    </Box>
  );
}
