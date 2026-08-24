"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";

export function ThreadActionsSample() {
  return (
    <SampleFrame className="bg-muted/40 h-120 overflow-hidden">
      <SampleRuntimeProvider
        messages={[
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
              "While the thread is idle, the last response shows its actions; earlier responses reveal them on hover.",
          },
        ]}
      >
        <Thread />
      </SampleRuntimeProvider>
    </SampleFrame>
  );
}
