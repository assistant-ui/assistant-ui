import { Box, Text } from "ink";
import {
  ThreadRoot,
  ThreadMessages,
  ThreadEmpty,
  ComposerInput,
  useThreadIsRunning,
} from "@assistant-ui/react-ink";
import type { ThreadMessage } from "@assistant-ui/react-ink";

const Message = ({ message }: { message: ThreadMessage; index: number }) => {
  const isUser = message.role === "user";
  const text = message.content
    .filter((p) => p.type === "text")
    .map((p) => ("text" in p ? p.text : ""))
    .join("");

  return (
    <Box marginBottom={1}>
      <Text bold color={isUser ? "green" : "blue"}>
        {isUser ? "You" : "AI"}:{" "}
      </Text>
      <Text wrap="wrap">{text}</Text>
    </Box>
  );
};

const StatusIndicator = () => {
  const isRunning = useThreadIsRunning();
  if (!isRunning) return null;
  return (
    <Box marginBottom={1}>
      <Text color="yellow">Thinking...</Text>
    </Box>
  );
};

export const Thread = () => {
  return (
    <ThreadRoot>
      <ThreadEmpty>
        <Box marginBottom={1}>
          <Text dimColor>No messages yet. Start typing below!</Text>
        </Box>
      </ThreadEmpty>

      <ThreadMessages renderMessage={(props) => <Message {...props} />} />

      <StatusIndicator />

      <Box borderStyle="round" borderColor="gray" paddingX={1}>
        <Text color="gray">{"> "}</Text>
        <ComposerInput
          submitOnEnter
          placeholder="Type a message..."
          autoFocus
        />
      </Box>
    </ThreadRoot>
  );
};
