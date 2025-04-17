"use client";
import { Thread } from "../assistant-ui/thread";
import { SampleFrame } from "./sample-frame";

export const BranchingSample = () => {
  return (
    <SampleFrame
      sampleText="Sample Branching"
      description="Try submitting then editing a message to see the branching in action."
    >
      <Thread />
    </SampleFrame>
  );
};
