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
        { role: "user", content: "What does the action bar include?" },
        {
          role: "assistant",
          content:
            "Each assistant response carries copy and regenerate actions in its action bar.",
        },
        { role: "user", content: "When is it visible?" },
        {
          role: "assistant",
          content:
            "The last response always shows its actions; earlier responses reveal them on hover or focus.",
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

export function ThreadActionsSample() {
  return (
    <SampleFrame className="bg-muted/40 h-120 overflow-hidden">
      <Chat />
    </SampleFrame>
  );
}
