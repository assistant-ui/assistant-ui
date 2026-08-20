"use client";

import { SampleFrame } from "@/components/docs/samples/sample-frame";
import {
  ReasoningRoot,
  ReasoningTrigger,
  ReasoningContent,
  ReasoningText,
} from "@/components/assistant-ui/reasoning";

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
      <div className="grid gap-3 sm:grid-cols-2">
        <ReasoningRoot className="mb-0" variant={variant}>
          <ReasoningTrigger />
          <ReasoningContent>
            <ReasoningText>
              <p>The closed state shows only the trigger.</p>
            </ReasoningText>
          </ReasoningContent>
        </ReasoningRoot>
        <ReasoningRoot className="mb-0" variant={variant} defaultOpen>
          <ReasoningTrigger />
          <ReasoningContent>
            <ReasoningText>
              <p>The open state shows the reasoning text below the trigger.</p>
            </ReasoningText>
          </ReasoningContent>
        </ReasoningRoot>
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
