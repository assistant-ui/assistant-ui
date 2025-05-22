"use client";
import { Thread } from "../assistant-ui/thread";
import { SampleFrame } from "./sample-frame";

export const ToolUISample = () => {
  return (
    <SampleFrame
      sampleText="Sample Tool UI"
      description="Ask 'what is the weather in Tokyo?'"
    >
      <Thread />
    </SampleFrame>
  );
};
