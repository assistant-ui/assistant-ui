"use client";

import {
  AssistantRuntimeProvider,
  type AppendMessage,
  type ThreadMessageLike,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { useRef, useState, type ReactNode } from "react";
import { generateSeedMessages, REPLY_CHUNKS } from "./seed-messages";

const convertMessage = (message: ThreadMessageLike) => message;

export function MyRuntimeProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] =
    useState<readonly ThreadMessageLike[]>(generateSeedMessages);
  const [isRunning, setIsRunning] = useState(false);
  const nextIdRef = useRef(0);

  const onNew = async (message: AppendMessage) => {
    if (message.content[0]?.type !== "text")
      throw new Error("Only text content is supported");
    const userText = message.content[0].text;
    const id = `reply-${nextIdRef.current++}`;

    setMessages((current) => [
      ...current,
      { id: `${id}-user`, role: "user", content: userText },
    ]);
    setIsRunning(true);
    try {
      for (let i = 1; i <= REPLY_CHUNKS.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 40));
        const content = REPLY_CHUNKS.slice(0, i).join("");
        setMessages((current) =>
          current.at(-1)?.id === id
            ? [...current.slice(0, -1), { id, role: "assistant", content }]
            : [...current, { id, role: "assistant", content }],
        );
      }
    } finally {
      setIsRunning(false);
    }
  };

  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    setMessages,
    isRunning,
    onNew,
    convertMessage,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
