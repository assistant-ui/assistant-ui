"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { SampleFrame } from "../sample-frame";

export function Chat() {
  const runtime = useLocalRuntime(
    {
      async *run() {
        yield { content: [{ type: "text", text: "This is a demo." }] };
      },
    },
    {
      initialMessages: [
        { role: "user", content: "Can you outline a launch checklist?" },
        {
          role: "assistant",
          content:
            "Start with positioning, define the audience, prepare the announcement, and choose success metrics.",
        },
        { role: "user", content: "What should I measure in the first week?" },
        {
          role: "assistant",
          content:
            "Track qualified visits, activation, support themes, and how many users return after their first session.",
        },
      ],
    },
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}

export function ThreadConversationSample() {
  return (
    <SampleFrame className="bg-muted/40 h-120 overflow-hidden">
      <Chat />
    </SampleFrame>
  );
}
