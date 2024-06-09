"use client";

import { useActions, useUIState } from "ai/rsc";
import { nanoid } from "nanoid";
import type { AI, ClientMessage } from "./actions";

import { Thread } from "@/components/ui/assistant-ui/thread";
import {
  type AppendMessage,
  AssistantRuntimeProvider,
  useVercelRSCRuntime,
} from "@assistant-ui/react";

export default function Home() {
  return (
    <main className="h-screen">
      <MyRuntimeProvider>
        <Thread />
      </MyRuntimeProvider>
    </main>
  );
}

const MyRuntimeProvider = ({ children }: { children: React.ReactNode }) => {
  const { continueConversation } = useActions();
  const [messages, setConversation] = useUIState<typeof AI>();

  const append = async (m: AppendMessage) => {
    if (m.content[0]?.type !== "text")
      throw new Error("Only text messages are supported");

    const input = m.content[0].text;
    setConversation((currentConversation: ClientMessage[]) => [
      ...currentConversation,
      { id: nanoid(), role: "user", display: input },
    ]);

    const message = await continueConversation(input);

    setConversation((currentConversation: ClientMessage[]) => [
      ...currentConversation,
      message,
    ]);
  };

  const runtime = useVercelRSCRuntime({ messages, append });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};
