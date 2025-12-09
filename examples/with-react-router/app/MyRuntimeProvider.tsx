import type {
  ThreadMessageLike,
  AppendMessage,
  ToolCallMessagePart,
  TextMessagePart,
} from "@assistant-ui/react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { useState, useCallback } from "react";

type ContentArray = Exclude<ThreadMessageLike["content"], string>;
type ContentPart = ContentArray[number];

const normalizeContent = (
  content: ThreadMessageLike["content"],
): ContentPart[] => {
  if (typeof content === "string") {
    return [{ type: "text", text: content } satisfies TextMessagePart];
  }
  return [...content];
};

const ensureAssistantMessage = (
  messages: readonly ThreadMessageLike[],
): { messages: ThreadMessageLike[]; assistantMsg: ThreadMessageLike } => {
  const newMsgs = [...messages];
  let lastMsg = newMsgs[newMsgs.length - 1];

  if (!lastMsg || lastMsg.role !== "assistant") {
    lastMsg = { role: "assistant", content: [] };
    newMsgs.push(lastMsg);
  }

  return { messages: newMsgs, assistantMsg: lastMsg };
};

const convertMessage = (message: ThreadMessageLike) => {
  return message;
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
      if (message.content.length !== 1 || message.content[0]?.type !== "text")
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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: newMessages.map((m) => {
              const firstPart = m.content[0];
              if (typeof firstPart === "string")
                return { role: m.role, content: firstPart };
              if (firstPart && "text" in firstPart)
                return { role: m.role, content: firstPart.text };
              return { role: m.role, content: "" };
            }),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch response");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let currentTextContent = "";

        const processChunk = (chunkText: string) => {
          const lines = chunkText.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === "text" && parsed.content) {
                  currentTextContent += parsed.content;
                  const updatedText = currentTextContent;

                  // Update message with new text content
                  setMessages((prev) => {
                    const { messages: newMsgs, assistantMsg } =
                      ensureAssistantMessage(prev);
                    const existingContent = normalizeContent(
                      assistantMsg.content,
                    );
                    const textPartIndex = existingContent.findIndex(
                      (p) => p.type === "text",
                    );
                    if (textPartIndex >= 0) {
                      existingContent[textPartIndex] = {
                        type: "text",
                        text: updatedText,
                      };
                    } else {
                      existingContent.push({
                        type: "text",
                        text: updatedText,
                      });
                    }
                    newMsgs[newMsgs.length - 1] = {
                      ...assistantMsg,
                      content: existingContent,
                    };
                    return newMsgs;
                  });
                } else if (parsed.type === "tool_call") {
                  // Add tool call content part
                  const toolCallPart: ToolCallMessagePart = {
                    type: "tool-call",
                    toolCallId: parsed.id,
                    toolName: parsed.name,
                    args: JSON.parse(parsed.arguments),
                    argsText: parsed.arguments,
                  };

                  setMessages((prev) => {
                    const { messages: newMsgs, assistantMsg } =
                      ensureAssistantMessage(prev);
                    const existingContent = normalizeContent(
                      assistantMsg.content,
                    );
                    newMsgs[newMsgs.length - 1] = {
                      ...assistantMsg,
                      content: [...existingContent, toolCallPart],
                    };
                    return newMsgs;
                  });
                } else if (parsed.type === "tool_result") {
                  const toolCallId = parsed.id;
                  const toolResult = JSON.parse(parsed.result);

                  // Update tool call with result
                  setMessages((prev) => {
                    const { messages: newMsgs, assistantMsg } =
                      ensureAssistantMessage(prev);
                    const existingContent = normalizeContent(
                      assistantMsg.content,
                    );
                    const updatedContent = existingContent.map((part) => {
                      if (
                        part.type === "tool-call" &&
                        (part as ToolCallMessagePart).toolCallId === toolCallId
                      ) {
                        return {
                          ...(part as ToolCallMessagePart),
                          result: toolResult,
                        };
                      }
                      return part;
                    });
                    newMsgs[newMsgs.length - 1] = {
                      ...assistantMsg,
                      content: updatedContent,
                    };
                    return newMsgs;
                  });
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          processChunk(chunk);
        }

        const finalChunk = decoder.decode();
        if (finalChunk) {
          processChunk(finalChunk);
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
    convertMessage,
    isRunning,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
