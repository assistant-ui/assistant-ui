import type { ComponentProps } from "react";
import { Text, type Box } from "ink";
import { ChecklistRoot } from "./ChecklistRoot";
import { ChecklistItem } from "./ChecklistItem";
import { ChecklistProgress } from "./ChecklistProgress";
import { useToolCallChecklist } from "./useToolCallChecklist";
import type { ChecklistItemData } from "./types";

export type LiveChecklistProps = ComponentProps<typeof Box> & {
  items?: ChecklistItemData[] | undefined;
  formatToolName?: ((toolName: string) => string) | undefined;
  title?: string | undefined;
  showProgress?: boolean | undefined;
  maxDepth?: number | undefined;
};

type ChecklistViewProps = ComponentProps<typeof Box> & {
  items: ChecklistItemData[];
  title?: string | undefined;
  showProgress?: boolean | undefined;
  maxDepth?: number | undefined;
};

const ChecklistView = ({
  items,
  title,
  showProgress,
  maxDepth,
  ...boxProps
}: ChecklistViewProps) => {
  if (items.length === 0) return null;

  return (
    <ChecklistRoot {...boxProps}>
      {title ? <Text bold>{title}</Text> : null}
      {items.map((item) => (
        <ChecklistItem key={item.id} item={item} maxDepth={maxDepth} />
      ))}
      {showProgress ? <ChecklistProgress items={items} /> : null}
    </ChecklistRoot>
  );
};

const AutoChecklist = ({
  formatToolName,
  ...props
}: Omit<LiveChecklistProps, "items">) => {
  const items = useToolCallChecklist({ formatToolName });
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
