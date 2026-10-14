"use client";

import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";
import { SampleScope } from "../sample-scope";
import { useSampleRuntime } from "../use-sample-runtime";

const CREATED_AT = new Date("2026-09-26T12:00:00Z");

export function Chat() {
  const runtime = useSampleRuntime(
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
        {
          role: "user",
          content: "What is assistant-ui?",
          createdAt: CREATED_AT,
        },
        {
          role: "assistant",
          content:
            "assistant-ui provides composable primitives for AI chat interfaces.",
          createdAt: CREATED_AT,
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
      <SampleScope>
        <Chat />
      </SampleScope>
    </SampleFrame>
  );
}
