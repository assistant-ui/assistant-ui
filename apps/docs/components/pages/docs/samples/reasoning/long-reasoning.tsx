"use client";

import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";
import {
  ReasoningRoot,
  ReasoningTrigger,
  ReasoningContent,
  ReasoningText,
} from "@/components/assistant-ui/reasoning";

export function ReasoningLongSample() {
  return (
    <SampleFrame className="h-auto p-4">
      <ReasoningRoot className="mb-0" variant="muted" defaultOpen>
        <ReasoningTrigger />
        <ReasoningContent>
          <ReasoningText>
            <p>
              The request asks for a migration that keeps the public API stable
              while the internals move to the new runtime, so the first step is
              to list every exported symbol the change could touch.
            </p>
            <p>
              Three of those exports are re-exported by the distribution
              packages, which means any signature change ripples into consumer
              builds. Those must keep their current shapes.
            </p>
            <p>
              The internal state holder can move freely because nothing outside
              the package imports it. Replacing it with the shared primitive
              removes a parallel mechanism and one source of drift.
            </p>
            <p>
              Converters need a defensive pass: provider payloads sometimes omit
              optional fields, and the current code assumes they exist. Each
              access gets a fallback that preserves the rendered output.
            </p>
            <p>
              Tests stay colocated with the modules they cover. The converter
              gets round-trip cases, the reducer gets one case per transition,
              and each accessor hook gets its own file.
            </p>
            <p>
              With the risk ranked, the safest order is converters first, then
              the state holder, then the hooks, verifying the docs build after
              each step so a regression surfaces immediately.
            </p>
          </ReasoningText>
        </ReasoningContent>
      </ReasoningRoot>
    </SampleFrame>
  );
}
