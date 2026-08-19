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
        { role: "user", content: "Summarize the benefits of typed APIs." },
        {
          role: "assistant",
          content:
            "Typed APIs catch integration mistakes earlier and improve editor",
          status: { type: "running" },
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

export function ThreadRunningSample() {
  return (
    <SampleFrame className="bg-muted/40 h-120 overflow-hidden">
      <Chat />
    </SampleFrame>
  );
}
