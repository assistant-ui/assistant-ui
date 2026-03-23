"use client";

import { memo } from "react";
import {
  Reasoning as ReasoningBase,
} from "@/components/assistant-ui/reasoning";
import { BrainIcon } from "lucide-react";
import {
  useAuiState,
  type ReasoningGroupComponent,
} from "@assistant-ui/react";

const ReasoningGroupImpl: ReasoningGroupComponent = ({
  children,
  startIndex,
  endIndex,
}) => {
  const isReasoningStreaming = useAuiState((s) => {
    if (s.message.status?.type !== "running") return false;
    const lastIndex = s.message.parts.length - 1;
    if (lastIndex < 0) return false;
    const lastType = s.message.parts[lastIndex]?.type;
    if (lastType !== "reasoning") return false;
    return lastIndex >= startIndex && lastIndex <= endIndex;
  });

  const reasoningText = useAuiState((s) => {
    let text = "";
    for (let i = startIndex; i <= endIndex; i++) {
      const part = s.message.parts[i];
      if (part?.type === "reasoning") {
        text += part.text;
      }
    }
    return text;
  });

  const isShort = !isReasoningStreaming && reasoningText.length < 100;

  if (isShort) {
    return (
      <div className="flex items-start gap-2 py-1 text-muted-foreground text-sm">
        <BrainIcon className="mt-0.5 size-3.5 shrink-0" />
        <div>{children}</div>
      </div>
    );
  }

  return (
    <ReasoningBase.Root variant="ghost" defaultOpen={isReasoningStreaming}>
      <ReasoningBase.Trigger active={isReasoningStreaming} />
      <ReasoningBase.Content aria-busy={isReasoningStreaming}>
        <ReasoningBase.Text>{children}</ReasoningBase.Text>
      </ReasoningBase.Content>
    </ReasoningBase.Root>
  );
};

export const ReasoningGroup = memo(ReasoningGroupImpl);
ReasoningGroup.displayName = "ReasoningGroup";
