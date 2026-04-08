"use client";

import type { A2uiComponentProps } from "@assistant-ui/react-a2ui";
import { resolveValue } from "@assistant-ui/react-a2ui";

export const StyledText = ({ def, getData }: A2uiComponentProps) => {
  const value = resolveValue(def.props?.value, getData);
  return (
    <p className="py-1 text-muted-foreground text-xs">
      {value != null ? String(value) : ""}
    </p>
  );
};
