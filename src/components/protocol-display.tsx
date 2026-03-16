import { Spinner } from "@inkjs/ui";
import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import type { ProtocolSelection } from "@/lib/protocols/selector.ts";
import { selectProtocol } from "@/lib/protocols/selector.ts";
import type { ProtocolType } from "@/types.ts";

type Props = {
  topic: string;
  onConfirm: (protocol: ProtocolType) => void;
};

export const PROTOCOL_LABELS: Record<ProtocolType, string> = {
  "round-robin": "Round Robin",
  "devils-advocate": "Devil's Advocate",
  dialectical: "Dialectical Inquiry",
  ngt: "Nominal Group Technique",
  stepladder: "Stepladder",
  delphi: "Delphi Method",
};

export function ProtocolDisplay({ topic, onConfirm }: Props) {
  const [selection, setSelection] = useState<ProtocolSelection | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    selectProtocol(topic)
      .then(setSelection)
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Protocol selection failed",
        );
      });
  }, [topic]);

  useInput((input) => {
    if (error) {
      // Retry on Enter
      if (input === "\r" || input === " ") {
        setError(null);
        selectProtocol(topic)
          .then(setSelection)
          .catch((err: unknown) => {
            setError(
              err instanceof Error ? err.message : "Protocol selection failed",
            );
          });
      }
      return;
    }
    if (!selection || confirmed) return;
    if (input === "\r" || input === " ") {
      setConfirmed(true);
      onConfirm(selection.protocol);
    }
  });

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text dimColor>[Enter to retry]</Text>
      </Box>
    );
  }

  if (!selection) {
    return (
      <Box>
        <Spinner label="Selecting deliberation protocol..." />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold color="green">
          Protocol:{" "}
        </Text>
        <Text bold>{PROTOCOL_LABELS[selection.protocol]}</Text>
      </Box>
      <Box marginLeft={2}>
        <Text dimColor>{selection.reason}</Text>
      </Box>
      {!confirmed && (
        <Box marginTop={1}>
          <Text dimColor>[Enter to continue]</Text>
        </Box>
      )}
    </Box>
  );
}
