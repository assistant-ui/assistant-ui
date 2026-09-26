import { createContext, useContext } from "react";
import { Box, Text } from "ink";
import {
  AuiIf,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ErrorPrimitive,
  LoadingPrimitive,
  LiveChecklist,
} from "@assistant-ui/react-ink";
import { MarkdownText } from "@assistant-ui/react-ink-markdown";

const ThreadWidthContext = createContext(80);

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

const AssistantMessage = () => {
  const width = useContext(ThreadWidthContext);
  return (
    <MessagePrimitive.Root>
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="blue">
          AI:
        </Text>
        <MessagePrimitive.Content
          renderText={({ part }) => (
            <MarkdownText text={part.text} width={Math.max(20, width - 2)} />
          )}
          renderReasoning={({ part }) => (
            <Text dimColor italic>
              {part.text}
            </Text>
          )}
        />
        <LiveChecklist title="Plan" showProgress marginTop={1} />
        <ErrorPrimitive.Root>
          <ErrorPrimitive.Message />
        </ErrorPrimitive.Root>
      </Box>
    </MessagePrimitive.Root>
  );
};

const Loading = () => (
  <LoadingPrimitive.Root marginBottom={1}>
    <LoadingPrimitive.Spinner />
    <Text> </Text>
    <LoadingPrimitive.Text>Working</LoadingPrimitive.Text>
    <Text> </Text>
    <LoadingPrimitive.ElapsedTime />
  </LoadingPrimitive.Root>
);

export const Thread = ({
  isComposing = true,
  width = 80,
}: {
  isComposing?: boolean;
  width?: number;
}) => {
  return (
    <ThreadWidthContext.Provider value={width}>
      <ThreadPrimitive.Root>
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <Box flexDirection="column" marginBottom={1}>
            <Text>
              Working in this project. <Text color="yellow">fetchUser()</Text>{" "}
              is flaky in prod and has no retry logic.
            </Text>
            <Text dimColor>{'  try: "make fetchUser retry on failure"'}</Text>
          </Box>
        </AuiIf>

        <ThreadPrimitive.Messages>
          {({ message }) =>
            message.role === "user" ? <UserMessage /> : <AssistantMessage />
          }
        </ThreadPrimitive.Messages>

        <Loading />

        <Box borderStyle="round" borderColor="gray" paddingX={1}>
          <Text color="gray">{"> "}</Text>
          {isComposing ? (
            <ComposerPrimitive.Input
              submitOnEnter
              multiLine
              placeholder="Type a message... (Enter to send)"
              autoFocus
            />
          ) : (
            <Text dimColor>Press Esc to return to your message</Text>
          )}
        </Box>
      </ThreadPrimitive.Root>
    </ThreadWidthContext.Provider>
  );
};
