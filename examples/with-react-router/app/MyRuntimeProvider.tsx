import type {
  ThreadMessageLike,
  AppendMessage,
  TextMessagePart,
  ToolCallMessagePart,
} from "@assistant-ui/react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { useState, useCallback } from "react";

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
        const assistantContent: (TextMessagePart | ToolCallMessagePart)[] = [];
        let currentTextContent = "";

        // Add initial assistant message
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: [],
          },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === "text" && parsed.content) {
                  currentTextContent += parsed.content;

                  // Update or add text content part
                  const textPartIndex = assistantContent.findIndex(
                    (p) => p.type === "text",
                  );
                  if (textPartIndex >= 0) {
                    assistantContent[textPartIndex] = {
                      type: "text",
                      text: currentTextContent,
                    };
                  } else {
                    assistantContent.push({
                      type: "text",
                      text: currentTextContent,
                    });
                  }

                  // Update message
                  setMessages((prev) => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg && lastMsg.role === "assistant") {
                      newMsgs[newMsgs.length - 1] = {
                        ...lastMsg,
                        content: [...assistantContent],
                      };
                    }
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
                  assistantContent.push(toolCallPart);

                  setMessages((prev) => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg && lastMsg.role === "assistant") {
                      newMsgs[newMsgs.length - 1] = {
                        ...lastMsg,
                        content: [...assistantContent],
                      };
                    }
                    return newMsgs;
                  });
                } else if (parsed.type === "tool_result") {
                  // Update tool call with result
                  const toolCallIndex = assistantContent.findIndex(
                    (p) =>
                      p.type === "tool-call" &&
                      (p as ToolCallMessagePart).toolCallId === parsed.id,
                  );

                  if (toolCallIndex >= 0) {
                    const toolCall = assistantContent[
                      toolCallIndex
                    ] as ToolCallMessagePart;
                    assistantContent[toolCallIndex] = {
                      ...toolCall,
                      result: JSON.parse(parsed.result),
                    };

                    setMessages((prev) => {
                      const newMsgs = [...prev];
                      const lastMsg = newMsgs[newMsgs.length - 1];
                      if (lastMsg && lastMsg.role === "assistant") {
                        newMsgs[newMsgs.length - 1] = {
                          ...lastMsg,
                          content: [...assistantContent],
                        };
                      }
                      return newMsgs;
                    });
                  }
                }
              } catch {
                // Ignore parse errors
              }
            }
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
    convertMessage,
    isRunning,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
