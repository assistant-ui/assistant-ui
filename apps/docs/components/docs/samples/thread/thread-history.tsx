"use client";

import { Thread } from "@/components/assistant-ui/thread";
import type { ThreadMessageLike } from "@assistant-ui/react";
import { SampleFrame } from "../sample-frame";
import { SampleRuntimeProvider } from "../sample-runtime-provider";

const MESSAGES: ThreadMessageLike[] = [
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
];

export function ThreadHistorySample() {
  return (
    <SampleFrame className="bg-muted/40 h-120 overflow-hidden">
      <SampleRuntimeProvider messages={MESSAGES}>
        <Thread />
      </SampleRuntimeProvider>
    </SampleFrame>
  );
}
