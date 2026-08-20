"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { useCallback } from "react";
import { SampleFrame } from "../sample-frame";

export function ThreadRunningSample() {
  return (
    <SampleFrame className="bg-muted/40 h-120 overflow-hidden">
      <RunningResponseChat />
    </SampleFrame>
  );
}

function RunningResponseChat() {
  const runtime = useLocalRuntime({
    // First run yields a partial response and stays running until the user
    // clicks stop; follow-up prompts finish with a short reply.
    async *run({ messages, abortSignal }) {
      if (messages.length > 1) {
        yield {
          content: [
            {
              type: "text",
              text: "This is a demo. Typed APIs catch integration mistakes earlier and improve editor support.",
            },
          ],
        };
        return;
      }
      yield {
        content: [
          {
            type: "text",
            text: "Typed APIs catch integration mistakes earlier and improve editor",
          },
        ],
      };
      await new Promise<void>((resolve) => {
        abortSignal.addEventListener("abort", () => resolve(), { once: true });
      });
    },
  });

  // Defer the append one tick so strict mode's mount/unmount cycle cannot
  // abort the run before the first yield; the cleanup cancels the timer if
  // the sample unmounts first.
  const startRun = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const timeout = setTimeout(() => {
        if (runtime.thread.getState().messages.length > 0) return;
        runtime.thread.append("Summarize the benefits of typed APIs.");
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
