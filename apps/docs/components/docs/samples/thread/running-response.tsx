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
    // Yields a partial response, then stays running until the user clicks
    // stop, so the send/cancel toggle is driven by a real cancellable run.
    async *run({ abortSignal }) {
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

  // Defer the append one tick so React strict mode's mount/unmount cycle
  // cannot abort the run before the first yield lands.
  const startRun = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      setTimeout(() => {
        if (runtime.thread.getState().messages.length > 0) return;
        runtime.thread.append("Summarize the benefits of typed APIs.");
      }, 0);
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
