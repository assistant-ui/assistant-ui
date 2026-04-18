import { useMemo } from "react";
import { Box, Text } from "ink";
import {
  AssistantRuntimeProvider,
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

    // Simulate streaming with a markdown-rich response
    const response = `## Response to your question

You asked: **"${userText}"**

Here's a quick example in JavaScript:

\`\`\`js
const promise = new Promise((resolve, reject) => {
  setTimeout(() => resolve("done!"), 1000);
});

promise.then(result => console.log(result));
\`\`\`

### Key points

- A \`Promise\` represents an **async operation**
- It can be *pending*, *fulfilled*, or *rejected*
- Use \`.then()\` and \`.catch()\` to handle results

> Promises are the foundation of modern async JavaScript.

| Method | Purpose |
|--------|---------|
| \`.then()\` | Handle success |
| \`.catch()\` | Handle errors |
| \`.finally()\` | Run cleanup |

Learn more at [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).`;
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
    <AssistantRuntimeProvider runtime={runtime}>
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
    </AssistantRuntimeProvider>
  );
};
