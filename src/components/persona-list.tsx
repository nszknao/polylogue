import { Spinner } from "@inkjs/ui";
import { Box, Text } from "ink";
import { useEffect, useState } from "react";
import { castPersonas } from "@/lib/casting.ts";
import { assignRoles } from "@/lib/protocols/index.ts";
import type { Persona, ProtocolType } from "@/types.ts";

type Props = {
  topic: string;
  protocol: ProtocolType;
  onConfirm: (personas: Persona[]) => void;
};

export function PersonaList({ topic, protocol, onConfirm }: Props) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setLoading(true);
    castPersonas(topic)
      .then((result) => {
        const withRoles = assignRoles(protocol, result);
        setPersonas(withRoles);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Persona generation failed",
        );
        setLoading(false);
      });
  }, [topic, protocol]);

  useEffect(() => {
    if (!loading && !error && personas.length > 0) {
      onConfirm(personas);
    }
  }, [loading, error, personas, onConfirm]);

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text dimColor>[Ctrl+C to exit]</Text>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box>
        <Spinner label="Generating personas..." />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>Personas:</Text>
      {personas.map((p) => (
        <Box key={p.id} marginLeft={2}>
          <Text color={p.color}>● {p.name}</Text>
          <Text dimColor>
            {" "}
            - {p.expertise}
            {p.role ? ` [${p.role}]` : ""} ({p.model}
            {p.tools?.length ? ` +${p.tools.join(",")}` : ""})
          </Text>
        </Box>
      ))}
    </Box>
  );
}
