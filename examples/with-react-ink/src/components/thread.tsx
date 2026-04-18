import { Box, Text } from "ink";
import {
  ThreadPrimitive,
  ComposerPrimitive,
  useAuiState,
} from "@assistant-ui/react-ink";
import { MarkdownText } from "@assistant-ui/react-ink-markdown";

const UserMessage = () => {
  const text = useAuiState((s) =>
    s.message.parts
      .filter((p) => p.type === "text")
      .map((p) => ("text" in p ? p.text : ""))
      .join(""),
  );

  return (
    <Box marginBottom={1}>
      <Text bold color="green">
        You:{" "}
      </Text>
      <Text wrap="wrap">{text}</Text>
    </Box>
  );
};

const AssistantMessage = () => {
  const text = useAuiState((s) =>
    s.message.parts
      .filter((p) => p.type === "text")
      .map((p) => ("text" in p ? p.text : ""))
      .join(""),
  );

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="blue">
        AI:
      </Text>
      <MarkdownText text={text} />
    </Box>
  );
};

const StatusIndicator = () => {
  const isRunning = useAuiState((s) => s.thread.isRunning);
  if (!isRunning) return null;
  return (
    <Box marginBottom={1}>
      <Text color="yellow">Thinking...</Text>
    </Box>
  );
};

export const Thread = () => {
  return (
    <ThreadPrimitive.Root>
      <ThreadPrimitive.Empty>
        <Box marginBottom={1}>
          <Text dimColor>No messages yet. Start typing below!</Text>
        </Box>
      </ThreadPrimitive.Empty>

      <ThreadPrimitive.Messages>
        {({ message }) =>
          message.role === "user" ? <UserMessage /> : <AssistantMessage />
        }
      </ThreadPrimitive.Messages>

      <StatusIndicator />

      <Box borderStyle="round" borderColor="gray" paddingX={1}>
        <Text color="gray">{"> "}</Text>
        <ComposerPrimitive.Input
          submitOnEnter
          placeholder="Type a message..."
          autoFocus
        />
      </Box>
    </ThreadPrimitive.Root>
  );
};
