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

const PROTOCOL_ORDER: ProtocolType[] = [
  "round-robin",
  "devils-advocate",
  "dialectical",
  "ngt",
  "stepladder",
  "delphi",
];

export const PROTOCOL_LABELS: Record<ProtocolType, string> = {
  "round-robin": "Round Robin",
  "devils-advocate": "Devil's Advocate",
  dialectical: "Dialectical Inquiry",
  ngt: "Nominal Group Technique",
  stepladder: "Stepladder",
  delphi: "Delphi Method",
};

const PROTOCOL_HINTS: Record<ProtocolType, string> = {
  "round-robin": "General brainstorming, broad exploration",
  "devils-advocate": "Stress-test a proposal with systematic criticism",
  dialectical: "Opposing teams debate to reach synthesis",
  ngt: "Diverge ideas independently, then share and vote",
  stepladder: "Add voices one-by-one for equal participation",
  delphi: "Anonymous multi-round consensus on uncertain topics",
};

export function ProtocolDisplay({ topic, onConfirm }: Props) {
  const [selection, setSelection] = useState<ProtocolSelection | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    selectProtocol(topic)
      .then((sel) => {
        setSelection(sel);
        const index = PROTOCOL_ORDER.indexOf(sel.protocol);
        if (index >= 0) setSelectedIndex(index);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Protocol selection failed",
        );
      });
  }, [topic]);

  useInput((_input, key) => {
    if (error) {
      if (key.return) {
        setError(null);
        selectProtocol(topic)
          .then((sel) => {
            setSelection(sel);
            const index = PROTOCOL_ORDER.indexOf(sel.protocol);
            if (index >= 0) setSelectedIndex(index);
          })
          .catch((err: unknown) => {
            setError(
              err instanceof Error ? err.message : "Protocol selection failed",
            );
          });
      }
      return;
    }
    if (!selection || confirmed) return;
    if (key.upArrow) {
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : PROTOCOL_ORDER.length - 1,
      );
    }
    if (key.downArrow) {
      setSelectedIndex((prev) =>
        prev < PROTOCOL_ORDER.length - 1 ? prev + 1 : 0,
      );
    }
    if (key.return) {
      setConfirmed(true);
      const protocol = PROTOCOL_ORDER[selectedIndex];
      if (protocol) onConfirm(protocol);
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
      <Box flexDirection="column" marginBottom={1}>
        <Text>
          <Text dimColor>Recommended: </Text>
          <Text bold>{PROTOCOL_LABELS[selection.protocol]}</Text>
        </Text>
        <Text dimColor> {selection.reason}</Text>
      </Box>
      <Text>Select protocol (↑↓ to change, Enter to confirm):</Text>
      {PROTOCOL_ORDER.map((p, i) => (
        <Text key={p}>
          <Text color={i === selectedIndex ? "green" : "gray"}>
            {i === selectedIndex ? "❯ " : "  "}
          </Text>
          {PROTOCOL_LABELS[p]}
          <Text dimColor>
            {" — "}
            {PROTOCOL_HINTS[p]}
            {p === selection.protocol ? " (recommended)" : ""}
          </Text>
        </Text>
      ))}
    </Box>
  );
}
