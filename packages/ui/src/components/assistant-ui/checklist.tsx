"use client";

import {
  type ComponentPropsWithoutRef,
  type FC,
  type ReactNode,
  Fragment,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  ChecklistPrimitive,
  useToolActivityChecklist,
  makeAssistantDataUI,
  type ChecklistItemData,
  type ChecklistData,
  type DataMessagePartProps,
} from "@assistant-ui/react";
import { cn } from "@/lib/utils";

const checklistVariants = cva(
  "aui-checklist-root flex flex-col gap-1.5 text-sm",
  {
    variants: {
      variant: {
        outline: "rounded-lg border px-3 py-2",
        ghost: "",
        muted: "bg-muted/50 rounded-lg px-3 py-2",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

const STATUS_INDICATORS: Record<ChecklistItemData["status"], string> = {
  pending: "□",
  running: "□",
  complete: "■",
  error: "✕",
};

const ChecklistItem: FC<{ item: ChecklistItemData; depth: number }> = ({
  item,
  depth,
}) => {
  const isRunning = item.status === "running";
  const isError = item.status === "error";

  return (
    <ChecklistPrimitive.Item
      item={item}
      data-slot="checklist-item"
      className={cn(
        "aui-checklist-item flex items-center gap-2 text-sm",
        depth > 0 && "ml-4",
      )}
    >
      <span
        data-slot="checklist-item-indicator"
        className={cn(
          "aui-checklist-item-indicator",
          isError ? "text-destructive" : "text-foreground",
        )}
      >
        {STATUS_INDICATORS[item.status]}
      </span>
      <span
        data-slot="checklist-item-text"
        className={cn("aui-checklist-item-text", isRunning && "shimmer")}
      >
        {item.text}
      </span>
      {item.detail ? (
        <span
          data-slot="checklist-item-detail"
          className="aui-checklist-item-detail text-muted-foreground text-xs"
        >
          {item.detail}
        </span>
      ) : null}
    </ChecklistPrimitive.Item>
  );
};

const ChecklistItems: FC<{
  items: ChecklistItemData[];
  depth: number;
  maxDepth: number;
}> = ({ items, depth, maxDepth }) => (
  <>
    {items.map((item) => (
      <Fragment key={item.id}>
        <ChecklistItem item={item} depth={depth} />
        {item.children && depth < maxDepth ? (
          <ChecklistItems
            items={item.children}
            depth={depth + 1}
            maxDepth={maxDepth}
          />
        ) : null}
      </Fragment>
    ))}
  </>
);

type ChecklistViewProps = Omit<
  ComponentPropsWithoutRef<typeof ChecklistPrimitive.Root>,
  "title"
> &
  VariantProps<typeof checklistVariants> & {
    items: ChecklistItemData[];
    title?: ReactNode;
    showProgress?: boolean;
    maxDepth?: number;
  };

const ChecklistView: FC<ChecklistViewProps> = ({
  items,
  title,
  showProgress,
  maxDepth = 2,
  className,
  variant,
  ...props
}) => {
  if (items.length === 0) return null;

  return (
    <ChecklistPrimitive.Root
      data-slot="checklist-root"
      className={cn(checklistVariants({ variant }), className)}
      {...props}
    >
      {title ? (
        <span
          data-slot="checklist-title"
          className="aui-checklist-title font-medium"
        >
          {title}
        </span>
      ) : null}
      <ChecklistItems items={items} depth={0} maxDepth={maxDepth} />
      {showProgress ? (
        <ChecklistPrimitive.Progress
          data-slot="checklist-progress"
          items={items}
          className="aui-checklist-progress text-muted-foreground text-xs"
        />
      ) : null}
    </ChecklistPrimitive.Root>
  );
};

export type LiveChecklistProps = Omit<ChecklistViewProps, "items"> & {
  items?: ChecklistItemData[];
  formatToolName?: (toolName: string) => string;
};

const AutoChecklist: FC<Omit<LiveChecklistProps, "items">> = ({
  formatToolName = (name) => name.replace(/_/g, " "),
  ...props
}) => {
  const items = useToolActivityChecklist({ formatToolName });
  return <ChecklistView items={items} {...props} />;
};

const LiveChecklist: FC<LiveChecklistProps> = ({
  items,
  formatToolName,
  showProgress = true,
  ...props
}) => {
  if (!items) {
    return (
      <AutoChecklist
        formatToolName={formatToolName}
        showProgress={showProgress}
        {...props}
      />
    );
  }
  return <ChecklistView items={items} showProgress={showProgress} {...props} />;
};

LiveChecklist.displayName = "LiveChecklist";

const DataChecklist = (props: DataMessagePartProps<ChecklistData>) => {
  const { items, title, showProgress } = props.data;
  if (!items || items.length === 0) return null;
  return (
    <ChecklistView items={items} title={title} showProgress={showProgress} />
  );
};

DataChecklist.displayName = "DataChecklist";

const ChecklistDataUI = makeAssistantDataUI<ChecklistData>({
  name: "checklist",
  render: DataChecklist,
});

export {
  LiveChecklist,
  DataChecklist,
  ChecklistDataUI,
  ChecklistItem,
  checklistVariants,
};
