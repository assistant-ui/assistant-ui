"use client";

import type { FC } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import type { ChecklistItemData } from "@assistant-ui/react";
import { LiveChecklist as LiveChecklistPrimitive } from "@assistant-ui/react";
import { cn } from "@/lib/utils";

const checklistVariants = cva("aui-checklist-root", {
  variants: {
    variant: {
      outline: "rounded-lg border px-3 py-2",
      ghost: "",
      muted: "rounded-lg bg-muted/50 px-3 py-2",
    },
  },
  defaultVariants: {
    variant: "outline",
  },
});

type ChecklistProps = Omit<
  React.ComponentProps<typeof LiveChecklistPrimitive>,
  "renderItem"
> &
  VariantProps<typeof checklistVariants>;

const ChecklistItem: FC<{ item: ChecklistItemData; depth: number }> = ({
  item,
  depth,
}) => {
  const isRunning = item.status === "running";

  return (
    <div
      data-slot="checklist-item"
      data-status={item.status}
      className={cn(
        "aui-checklist-item flex items-center gap-2 text-sm",
        depth > 0 && "ml-4",
      )}
    >
      <span
        data-slot="checklist-item-indicator"
        className="aui-checklist-item-indicator text-foreground"
      >
        {item.status === "complete" ? "\u25A0" : "\u25A1"}
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
    </div>
  );
};

const ChecklistProgress: FC<{ done: number; total: number }> = ({
  done,
  total,
}) => (
  <div
    data-slot="checklist-progress"
    className="aui-checklist-progress text-muted-foreground text-xs"
  >
    {done}/{total} complete
  </div>
);

const LiveChecklist: FC<ChecklistProps> = ({
  className,
  variant,
  showProgress = true,
  formatToolName = (name: string) => name.replace(/_/g, " "),
  ...props
}) => {
  return (
    <LiveChecklistPrimitive
      data-slot="checklist-root"
      className={cn(
        "flex flex-col gap-1.5 text-sm *:data-done:text-muted-foreground *:data-done:text-xs",
        checklistVariants({ variant, className }),
      )}
      showProgress={showProgress}
      formatToolName={formatToolName}
      renderItem={({ item, depth }) => (
        <ChecklistItem item={item} depth={depth} />
      )}
      {...props}
    />
  );
};

LiveChecklist.displayName = "LiveChecklist";

export { LiveChecklist, ChecklistItem, ChecklistProgress, checklistVariants };
