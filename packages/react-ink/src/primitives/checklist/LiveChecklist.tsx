import type { ComponentProps } from "react";
import { useToolActivityChecklist } from "./useToolActivityChecklist";
import type { ChecklistItemData } from "./types";
import { ChecklistView } from "./ChecklistView";
import type { Box } from "ink";

export type LiveChecklistProps = ComponentProps<typeof Box> & {
  items?: ChecklistItemData[] | undefined;
  formatToolName?: ((toolName: string) => string) | undefined;
  title?: string | undefined;
  showProgress?: boolean | undefined;
  maxDepth?: number | undefined;
};

const AutoChecklist = ({
  formatToolName,
  ...props
}: Omit<LiveChecklistProps, "items">) => {
  const items = useToolActivityChecklist({ formatToolName });
  return <ChecklistView items={items} {...props} />;
};

export const LiveChecklist = ({
  items,
  formatToolName,
  ...props
}: LiveChecklistProps) => {
  if (!items) {
    return <AutoChecklist formatToolName={formatToolName} {...props} />;
  }
  return <ChecklistView items={items} {...props} />;
};

LiveChecklist.displayName = "LiveChecklist";
