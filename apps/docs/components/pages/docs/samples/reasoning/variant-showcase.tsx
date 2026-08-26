"use client";

import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";
import {
  ReasoningRoot,
  ReasoningTrigger,
  ReasoningContent,
  ReasoningText,
} from "@/components/assistant-ui/reasoning";

function StateCard({
  state,
  variant,
  defaultOpen = false,
}: {
  state: string;
  variant: "outline" | "ghost" | "muted";
  defaultOpen?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
        {state} by default
      </span>
      <ReasoningRoot
        className="mb-0"
        variant={variant}
        defaultOpen={defaultOpen}
      >
        <ReasoningTrigger />
        <ReasoningContent>
          <ReasoningText>
            <p>Let me think about this step by step...</p>
            <p>
              First, I need to consider the main factors involved in this
              problem.
            </p>
          </ReasoningText>
        </ReasoningContent>
      </ReasoningRoot>
    </div>
  );
}

function VariantPair({
  label,
  variant,
}: {
  label: string;
  variant: "outline" | "ghost" | "muted";
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <div className="grid items-start gap-3 sm:grid-cols-2">
        <StateCard state="Closed" variant={variant} />
        <StateCard state="Open" variant={variant} defaultOpen />
      </div>
    </div>
  );
}

export function ReasoningVariantsSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <VariantPair label="Outline (default)" variant="outline" />
      <VariantPair label="Ghost" variant="ghost" />
      <VariantPair label="Muted" variant="muted" />
    </SampleFrame>
  );
}
