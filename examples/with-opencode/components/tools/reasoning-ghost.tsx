"use client";

import { memo } from "react";
import { BrainIcon } from "lucide-react";
import { useAuiState, type ReasoningGroupComponent } from "@assistant-ui/react";
import { cn } from "@/lib/utils";

const ReasoningGroupImpl: ReasoningGroupComponent = ({
  children,
  startIndex,
  endIndex,
}) => {
  const isMultiLine = useAuiState((s) => {
    let totalLength = 0;
    for (let i = startIndex; i <= endIndex; i++) {
      const part = s.message.parts[i];
      if (part?.type === "reasoning") {
        if (part.text.includes("\n\n")) return true;
        totalLength += part.text.length;
      }
    }
    return totalLength > 120;
  });

  const textAfter = useAuiState((s) => {
    for (let i = endIndex + 1; i < s.message.parts.length; i++) {
      const type = s.message.parts[i]?.type;
      if (type === "data") continue;
      return type === "text";
    }
    return false;
  });

  return (
    <div
      data-slot="reasoning-group"
      className={cn(
        "mt-4 mb-2 flex items-start gap-2 text-muted-foreground text-sm leading-relaxed first:mt-0",
        isMultiLine && "mt-6 mb-4",
        textAfter && "mb-4",
      )}
    >
      <BrainIcon className="mt-[3.25px] size-3.5 shrink-0" />
      <div className="space-y-4.5">{children}</div>
    </div>
  );
};

export const ReasoningGroup = memo(ReasoningGroupImpl);
ReasoningGroup.displayName = "ReasoningGroup";
