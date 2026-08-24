"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export function Chat() {
  const runtime = useLocalRuntime(
    {
      async *run() {
        yield {
          content: [
            {
              type: "text",
              text: "assistant-ui ships primitives, runtimes, and a component registry for chat interfaces.",
            },
          ],
        };
      },
    },
    {
      initialMessages: [
        { role: "user", content: "What is assistant-ui?" },
        {
          role: "assistant",
          content:
            "assistant-ui provides composable primitives for AI chat interfaces.",
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

export function ThreadBranchSample() {
  return (
    <SampleFrame className="bg-muted/40 h-120 overflow-hidden">
      <Chat />
    </SampleFrame>
  );
}
