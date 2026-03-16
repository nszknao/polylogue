import { TextInput } from "@inkjs/ui";
import { Box, Text } from "ink";

type Props = {
  onSubmit: (topic: string) => void;
};

export function TopicInput({ onSubmit }: Props) {
  return (
    <Box flexDirection="column">
      <Text>Enter a topic for discussion:</Text>
      <Box marginTop={1}>
        <Text color="green">❯ </Text>
        <TextInput onSubmit={onSubmit} />
      </Box>
    </Box>
  );
}
