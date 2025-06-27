"use client";

import { ThreadMessageLike } from "@assistant-ui/react";
import { AppendMessage } from "@assistant-ui/react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { useState } from "react";
import { Message } from "ai";

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

  const onNew = async (message: AppendMessage) => {
    if (message.content.length !== 1 || message.content[0]?.type !== "text")
      throw new Error("Only text content is supported");

    const userMessage: ThreadMessageLike = {
      id: `user-${Date.now()}`,
      role: "user",
      content: [{ type: "text", text: message.content[0].text }],
    };
    setMessages((currentMessages) => [...currentMessages, userMessage]);

    // Create assistant message placeholder
    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage: ThreadMessageLike = {
      id: assistantId,
      role: "assistant",
      content: [{ type: "text", text: "" }],
    };
    setMessages((currentMessages) => [...currentMessages, assistantMessage]);
    setIsRunning(true);

    try {
      // Convert messages to AI SDK format
      const aiMessages: Message[] = messages.concat(userMessage).map((msg) => ({
        id: msg.id || `${msg.role}-${Date.now()}`,
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content
          .map((part) => (part.type === "text" ? part.text : ""))
          .join(""),
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: aiMessages }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("0:")) {
              // This is a text chunk
              const content = line.slice(2).trim();
              if (content && content !== '""') {
                // Remove quotes if present
                const text = content.startsWith('"') && content.endsWith('"')
                  ? content.slice(1, -1)
                  : content;
                accumulatedText += text;

                // Update the assistant message with accumulated text
                setMessages((currentMessages) =>
                  currentMessages.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          content: [{ type: "text", text: accumulatedText }],
                        }
                      : m
                  )
                );
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error calling AI:", error);
      // Update assistant message with error
      setMessages((currentMessages) =>
        currentMessages.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: [
                  {
                    type: "text",
                    text: "Sorry, I encountered an error while processing your request.",
                  },
                ],
              }
            : m
        )
      );
    } finally {
      setIsRunning(false);
    }
  };

  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    setMessages,
    onNew,
    isRunning,
    convertMessage,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
