"use client";

import { useActions, useUIState } from "ai/rsc";
import { nanoid } from "nanoid";
import type { AI } from "./actions";

import { Thread } from "@/components/assistant-ui/thread";
import {
  type AppendMessage,
  AssistantRuntimeProvider,
} from "@assistant-ui/react";
import { useVercelRSCRuntime } from "@assistant-ui/react-ai-sdk";
import { useState } from "react";

export default function Home() {
  return (
    <main className="h-dvh">
      <MyRuntimeProvider>
        <Thread />
      </MyRuntimeProvider>
    </main>
  );
}

const MyRuntimeProvider = ({ children }: { children: React.ReactNode }) => {
  const { continueConversation } = useActions();
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useUIState<typeof AI>();

  const onNew = async (m: AppendMessage) => {
    if (m.content[0]?.type !== "text")
      throw new Error("Only text messages are supported");

    const input = m.content[0].text;
    setMessages((currentConversation) => [
      ...currentConversation,
      { id: nanoid(), role: "user", display: input },
    ]);

    try {
      setIsRunning(true);
      const message = await continueConversation(input);
      setMessages((currentConversation) => [...currentConversation, message]);
    } finally {
      setIsRunning(false);
    }
  };

  const runtime = useVercelRSCRuntime({ messages, isRunning, onNew });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};
