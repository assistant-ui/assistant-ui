"use client";

import { useActions, useUIState } from "ai/rsc";
import { nanoid } from "nanoid";
import type { ClientMessage } from "./actions";

import { Thread } from "@/components/ui/assistant-ui/thread";
import { TooltipProvider } from "@/components/ui/tooltip";
import { unstable_VercelRSCAssistantProvider as VercelRSCAssistantProvider } from "@assistant-ui/react";
// TODO
import type { CreateThreadMessage } from "../../../packages/react/src/utils/context/stores/AssistantTypes";

export default function Home() {
  const { continueConversation } = useActions();
  const [conversation, setConversation] = useUIState();
  const next = async (m: CreateThreadMessage) => {
    // TODO
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
  return (
    <main className="h-screen">
      <TooltipProvider>
        <VercelRSCAssistantProvider messages={conversation} append={next}>
          <Thread />
        </VercelRSCAssistantProvider>
      </TooltipProvider>
    </main>
  );
}
