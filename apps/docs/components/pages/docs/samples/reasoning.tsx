"use client";

import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { useCallback } from "react";
import { Thread } from "@/components/assistant-ui/thread";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";
import {
  ReasoningRoot,
  ReasoningTrigger,
  ReasoningContent,
  ReasoningText,
} from "@/components/assistant-ui/reasoning";

export function ReasoningSample() {
  return (
    <SampleFrame className="h-auto p-4">
      <ReasoningRoot defaultOpen className="mb-0">
        <ReasoningTrigger />
        <ReasoningContent>
          <ReasoningText>
            <p>Let me think about this step by step...</p>
            <p>
              First, I need to consider the main factors involved in this
              problem.
            </p>
          </ReasoningText>
        </ReasoningContent>
      </ReasoningRoot>
    </SampleFrame>
  );
}

function ReasoningStreamingThread() {
  const runtime = useLocalRuntime({
    // The first run yields partial reasoning and stays running until the
    // user stops it. Follow-up prompts finish with a short reply.
    async *run({ messages, abortSignal }) {
      if (messages.length > 1) {
        yield {
          content: [
            {
              type: "reasoning",
              text: "A short reply is enough here; the streamed run above already shows the live reasoning state.",
            },
            {
              type: "text",
              text: "This is a demo. The streamed run above shows how reasoning parts render while a response is active.",
            },
          ],
        };
        return;
      }
      yield {
        content: [
          {
            type: "reasoning",
            text: "Weighing the trade-offs between the available approaches...",
          },
        ],
      };
      yield {
        content: [
          {
            type: "reasoning",
            text: "Weighing the trade-offs between the available approaches...\n\nA smaller change surface is easier to review and revert, so I will rank the options by how little they touch.",
          },
        ],
      };
      await new Promise<void>((resolve) => {
        abortSignal.addEventListener("abort", () => resolve(), { once: true });
      });
    },
  });

  // Defer the append one tick so the strict-mode mount/unmount cycle cannot
  // abort the run before the first yield. The cleanup cancels the timer if
  // the sample unmounts first.
  const startRun = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const timeout = setTimeout(() => {
        if (runtime.thread.getState().messages.length > 0) return;
        runtime.thread.append("Compare the available approaches.");
      }, 0);
      return () => clearTimeout(timeout);
    },
    [runtime],
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div ref={startRun} className="h-full">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}

export function ReasoningStreamingSample() {
  return (
    <SampleFrame className="bg-muted/40 h-120 overflow-hidden">
      <ReasoningStreamingThread />
    </SampleFrame>
  );
}
