import { useState, useCallback } from "react";
import type { ThreadMessageLike, AppendMessage } from "@assistant-ui/react";

const INITIAL_MESSAGES: ThreadMessageLike[] = [];

const CANNED_RESPONSE = `Great question! Here's what I think:

This is a **mock response** from the external store runtime. In a real extension, you'd connect this to an AI backend like:

- [assistant-ui Cloud](https://www.assistant-ui.com)
- OpenAI via AI SDK
- Any custom API

The UI you're seeing is built with \`@assistant-ui/react\` -- the same components work in Next.js, Vite, React Native, and now browser extensions.`;

export function useMockStore() {
  const [messages, setMessages] =
    useState<readonly ThreadMessageLike[]>(INITIAL_MESSAGES);
  const [isRunning, setIsRunning] = useState(false);

  const onNew = useCallback(async (message: AppendMessage) => {
    if (message.content.length !== 1 || message.content[0]?.type !== "text")
      return;

    const userMessage: ThreadMessageLike = {
      role: "user",
      content: [{ type: "text", text: message.content[0].text }],
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsRunning(true);

    const words = CANNED_RESPONSE.split(" ");
    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 30));
      const partial = words.slice(0, i + 1).join(" ");
      setMessages((prev) => {
        const withoutLast =
          prev.at(-1)?.role === "assistant" ? prev.slice(0, -1) : prev;
        return [
          ...withoutLast,
          { role: "assistant", content: [{ type: "text", text: partial }] },
        ];
      });
    }

    setIsRunning(false);
  }, []);

  return { messages, setMessages, isRunning, onNew };
}
