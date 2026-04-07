"use client";

import { memo } from "react";
import clsx from "clsx";
import { BrainIcon } from "lucide-react";
import { useAuiState, type ReasoningGroupComponent } from "@assistant-ui/react";

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

  return (
    <div
      className={clsx(
        "flex items-start gap-2 text-muted-foreground text-sm leading-relaxed",
        isMultiLine ? "mt-6 mb-4" : "mt-4 mb-2",
      )}
    >
      <BrainIcon className="mt-[3.25px] size-3.5 shrink-0" />
      <div className="space-y-4.5">{children}</div>
    </div>
  );
};

export const ReasoningGroup = memo(ReasoningGroupImpl);
ReasoningGroup.displayName = "ReasoningGroup";
