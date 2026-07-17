// Mirrors examples/with-react-ink/src/components/thread.tsx; keep in sync.
import { Box, Text, useStdout } from "ink";
import {
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ErrorPrimitive,
  LoadingPrimitive,
  LiveChecklist,
} from "@assistant-ui/react-ink";
import { MarkdownText } from "@assistant-ui/react-ink-markdown";

// markdansi defaults width and color from process.stdout, which does not
// exist in the browser bundle; pass both explicitly so it never reads it.
const BrowserMarkdownText = ({ text }: { text: string }) => {
  const { stdout } = useStdout();
  return (
    <MarkdownText
      text={text}
      width={(stdout?.columns ?? 80) - 4}
      hyperlinks={false}
      color
    />
  );
};

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
        renderText={({ part }) => <BrowserMarkdownText text={part.text} />}
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
            A real LLM streaming into a real Ink render loop in your browser.
          </Text>
          <Text dimColor>
            {'  try: "what is assistant-ui?" or "how do I render markdown?"'}
          </Text>
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
