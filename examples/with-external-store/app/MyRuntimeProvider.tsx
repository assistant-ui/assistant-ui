"use client";

import { ThreadMessageLike } from "@assistant-ui/react";
import { AppendMessage } from "@assistant-ui/react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { useState } from "react";

const convertMessage = (message: ThreadMessageLike) => {
  return message;
};

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [messages, setMessages] = useState<readonly ThreadMessageLike[]>([]);

  const onNew = async (message: AppendMessage) => {
    if (message.content.length !== 1 || message.content[0]?.type !== "text")
      throw new Error("Only text content is supported");

    const userMessage: ThreadMessageLike = {
      role: "user",
      content: [{ type: "text", text: message.content[0].text }],
    };
    setMessages((currentMessages) => [...currentMessages, userMessage]);

    // normally you would perform an API call here to get the assistant response
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const assistantMessage: ThreadMessageLike = {
      role: "assistant",
      content: [{ type: "text", text: "Hello, world!" }],
    };
    setMessages((currentMessages) => [...currentMessages, assistantMessage]);
  };

  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    setMessages,
    onNew,
    convertMessage,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
