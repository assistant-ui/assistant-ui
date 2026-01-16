"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

export const BranchingSample = () => {
  return (
    <SampleFrame className="overflow-hidden bg-muted/40">
      <Thread />
    </SampleFrame>
  );
};
