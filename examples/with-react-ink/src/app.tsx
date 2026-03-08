import { useMemo } from "react";
import { Box, Text } from "ink";
import {
  AssistantProvider,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react-ink";
import { Thread } from "./components/thread.js";

const createDemoAdapter = (): ChatModelAdapter => ({
  async *run({ messages }) {
    const lastUserMessage = messages.filter((m) => m.role === "user").at(-1);

    const userText =
      lastUserMessage?.content
        .filter((p) => p.type === "text")
        .map((p) => ("text" in p ? p.text : ""))
        .join("") ?? "";

    // Simulate streaming by yielding word by word
    const response = `You said: "${userText}". This is a demo response from the terminal chat powered by assistant-ui and React Ink!`;
    const words = response.split(" ");

    let accumulated = "";
    for (const word of words) {
      accumulated += (accumulated ? " " : "") + word;
      yield { content: [{ type: "text" as const, text: accumulated }] };
      await new Promise((r) => setTimeout(r, 50));
    }
  },
});

export const App = () => {
  const adapter = useMemo(() => createDemoAdapter(), []);
  const runtime = useLocalRuntime(adapter);

  return (
    <AssistantProvider runtime={runtime}>
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">
          assistant-ui Terminal Chat
        </Text>
        <Text dimColor>
          Type a message and press Enter to send. Ctrl+C to exit.
        </Text>
        <Box marginTop={1}>
          <Thread />
        </Box>
      </Box>
    </AssistantProvider>
  );
};
