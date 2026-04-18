import { cn } from "@/lib/utils";
import { useAuiState } from "@assistant-ui/react";
import { memo, type FC, type PropsWithChildren } from "react";

// ── ToolGroup — lightweight wrapper for spacing ─────────────────────────
export const ToolGroupImpl: FC<
  PropsWithChildren<{ startIndex: number; endIndex: number }>
> = ({ children, startIndex, endIndex }) => {
  const textBefore = useAuiState((s) => {
    for (let i = startIndex - 1; i >= 0; i--) {
      const type = s.message.parts[i]?.type;
      if (type === "data") continue;
      return type === "text";
    }
    return false;
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
      data-slot="tool-group"
      className={cn(textBefore && "mt-4", textAfter && "mb-4")}
    >
      {children}
    </div>
  );
};

export const ToolGroup = memo(ToolGroupImpl);
