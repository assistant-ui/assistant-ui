"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export const ToolUISample = () => {
  return (
    <SampleFrame className="bg-muted/40 overflow-hidden">
      <Thread />
    </SampleFrame>
  );
};
