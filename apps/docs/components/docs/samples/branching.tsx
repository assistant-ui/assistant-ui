"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

export const BranchingSample = () => {
  return (
    <SampleFrame className="bg-muted/40 overflow-hidden">
      <Thread />
    </SampleFrame>
  );
};
