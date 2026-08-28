"use client";

import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export const BranchingSample = () => {
  return (
    <SampleFrame className="bg-muted/40 overflow-hidden">
      <Thread />
    </SampleFrame>
  );
};
