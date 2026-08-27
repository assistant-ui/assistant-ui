"use client";

import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";
import {
  ReasoningRoot,
  ReasoningTrigger,
  ReasoningContent,
  ReasoningText,
} from "@/components/assistant-ui/reasoning";

export function ReasoningCompletedSample() {
  return (
    <SampleFrame className="h-auto p-4">
      <ReasoningRoot className="mb-0" variant="outline">
        <ReasoningTrigger duration={12} />
        <ReasoningContent>
          <ReasoningText>
            <p>
              I compared the constraints and selected the smallest safe change.
            </p>
            <p>The response is complete, so this detail starts closed.</p>
          </ReasoningText>
        </ReasoningContent>
      </ReasoningRoot>
    </SampleFrame>
  );
}
