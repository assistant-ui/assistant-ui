import type { ThreadMessageLike, AppendMessage } from "@assistant-ui/react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { createParser, type EventSourceMessage } from "eventsource-parser";
import { useState, useCallback } from "react";

// SSE event types from server
type SSEEvent =
  | { type: "text"; content: string }
  | { type: "tool_call"; id: string; name: string; arguments: string }
  | { type: "tool_result"; id: string; result: string };

// Parse SSE stream using eventsource-parser
async function* parseSSEStream(
  response: Response,
): AsyncGenerator<SSEEvent, void, unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No reader available");

  const decoder = new TextDecoder();
  const events: SSEEvent[] = [];
  let done = false;

  const parser = createParser({
    onEvent: (event: EventSourceMessage) => {
      if (event.data === "[DONE]") {
        done = true;
        return;
      }
      try {
        events.push(JSON.parse(event.data) as SSEEvent);
      } catch {
        // Skip invalid JSON
      }
    },
  });

  while (!done) {
    const result = await reader.read();
    if (result.done) break;

    parser.feed(decoder.decode(result.value, { stream: true }));

    while (events.length > 0) {
      yield events.shift()!;
    }
  }

  // Yield any remaining events
  while (events.length > 0) {
    yield events.shift()!;
  }
}

// Extract content part type from ThreadMessageLike
type ContentPart = Exclude<ThreadMessageLike["content"], string>[number];

// Helper to update assistant message content
const updateAssistantContent = (
  messages: readonly ThreadMessageLike[],
  updater: (content: ContentPart[]) => ContentPart[],
): ThreadMessageLike[] => {
  const newMessages = [...messages];
  const lastMsg = newMessages[newMessages.length - 1];

  if (lastMsg?.role === "assistant") {
    const content = Array.isArray(lastMsg.content)
      ? [...lastMsg.content]
      : [{ type: "text" as const, text: lastMsg.content as string }];
    newMessages[newMessages.length - 1] = {
      ...lastMsg,
      content: updater(content),
    };
  } else {
    newMessages.push({ role: "assistant", content: updater([]) });
  }

  return newMessages;
};

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [messages, setMessages] = useState<readonly ThreadMessageLike[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const onNew = useCallback(
    async (message: AppendMessage) => {
      if (message.content[0]?.type !== "text")
        throw new Error("Only text content is supported");

      const userMessage: ThreadMessageLike = {
        role: "user",
        content: [{ type: "text", text: message.content[0].text }],
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setIsRunning(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({
              role: m.role,
              content:
                typeof m.content === "string"
                  ? m.content
                  : ((m.content[0] as { text?: string })?.text ?? ""),
            })),
          }),
        });

        if (!response.ok) throw new Error("Failed to fetch response");

        let textContent = "";

        for await (const event of parseSSEStream(response)) {
          switch (event.type) {
            case "text":
              textContent += event.content;
              setMessages((prev) =>
                updateAssistantContent(prev, (content) => {
                  const idx = content.findIndex((p) => p.type === "text");
                  const textPart = { type: "text" as const, text: textContent };
                  if (idx >= 0) {
                    content[idx] = textPart;
                  } else {
                    content.push(textPart);
                  }
                  return content;
                }),
              );
              break;

            case "tool_call":
              setMessages((prev) =>
                updateAssistantContent(prev, (content) => [
                  ...content,
                  {
                    type: "tool-call" as const,
                    toolCallId: event.id,
                    toolName: event.name,
                    args: JSON.parse(event.arguments),
                    argsText: event.arguments,
                  },
                ]),
              );
              break;

            case "tool_result":
              setMessages((prev) =>
                updateAssistantContent(prev, (content) =>
                  content.map((part) =>
                    part.type === "tool-call" && part.toolCallId === event.id
                      ? { ...part, result: JSON.parse(event.result) }
                      : part,
                  ),
                ),
              );
              break;
          }
        }
      } catch (error) {
        console.error("Error:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: [
              {
                type: "text",
                text: "Sorry, an error occurred. Please try again.",
              },
            ],
          },
        ]);
      } finally {
        setIsRunning(false);
      }
    },
    [messages],
  );

  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    setMessages,
    onNew,
    convertMessage: (m) => m,
    isRunning,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
