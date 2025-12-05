"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { SampleFrame } from "@/components/samples/sample-frame";

export const ToolUISample = () => {
  return (
    <SampleFrame
      sampleText="Sample Tool UI"
      description="Ask 'what is the weather in San Francisco?'"
    >
      <Thread />
    </SampleFrame>
  );
};
