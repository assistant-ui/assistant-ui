import { Box, Text } from "ink";
import {
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ErrorPrimitive,
  LoadingPrimitive,
  LiveChecklist,
} from "@assistant-ui/react-ink";
import { MarkdownText } from "@assistant-ui/react-ink-markdown";

const UserMessage = () => (
  <MessagePrimitive.Root>
    <Box marginBottom={1}>
      <Text bold color="green">
        You:{" "}
      </Text>
      <MessagePrimitive.Content
        renderText={({ part }) => <Text wrap="wrap">{part.text}</Text>}
      />
    </Box>
  </MessagePrimitive.Root>
);

const AssistantMessage = () => (
  <MessagePrimitive.Root>
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="blue">
        AI:
      </Text>
      <MessagePrimitive.Content
        renderText={({ part }) => <MarkdownText text={part.text} />}
        renderReasoning={({ part }) => (
          <Text dimColor italic>
            {part.text}
          </Text>
        )}
      />
      <LiveChecklist title="Plan" showProgress marginTop={1} />
      <MessagePrimitive.Error>
        <ErrorPrimitive.Root>
          <ErrorPrimitive.Message />
        </ErrorPrimitive.Root>
      </MessagePrimitive.Error>
    </Box>
  </MessagePrimitive.Root>
);

const Loading = () => (
  <LoadingPrimitive.Root marginBottom={1}>
    <LoadingPrimitive.Spinner />
    <Text> </Text>
    <LoadingPrimitive.Text>Working</LoadingPrimitive.Text>
    <Text> </Text>
    <LoadingPrimitive.ElapsedTime />
  </LoadingPrimitive.Root>
);

export const Thread = () => {
  return (
    <ThreadPrimitive.Root>
      <ThreadPrimitive.Empty>
        <Box flexDirection="column" marginBottom={1}>
          <Text>
            Working in this project. <Text color="yellow">fetchUser()</Text> is
            flaky in prod and has no retry logic.
          </Text>
          <Text dimColor>{'  try: "make fetchUser retry on failure"'}</Text>
        </Box>
      </ThreadPrimitive.Empty>

      <ThreadPrimitive.Messages>
        {({ message }) =>
          message.role === "user" ? <UserMessage /> : <AssistantMessage />
        }
      </ThreadPrimitive.Messages>

      <Loading />

      <Box borderStyle="round" borderColor="gray" paddingX={1}>
        <Text color="gray">{"> "}</Text>
        <ComposerPrimitive.Input
          submitOnEnter
          multiLine
          placeholder="Type a message... (Enter to send)"
          autoFocus
        />
      </Box>
    </ThreadPrimitive.Root>
  );
};
