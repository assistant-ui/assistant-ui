"use client";

import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { ChevronDown, FileText } from "lucide-react";
import type { XuluxFileReference } from "@/lib/xulux/learn/file-reference";
import { cn } from "@/lib/utils";
import { LearnFileView } from "./LearnFileView";
import { useOptionalLearnMode } from "./LearnModeContext";
import { useOptionalLearnStageSource } from "./LearnStageSourceContext";

export function LearnInlineFileReference({
  reference,
  className,
}: {
  reference: XuluxFileReference;
  className?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const source = useOptionalLearnStageSource();
  const learnMode = useOptionalLearnMode();
  const record =
    source?.status === "ready" ? source.records.get(reference.path) : undefined;

  if (!record || !learnMode) {
    return (
      <code
        className={cn(
          "border-border/50 bg-muted/50 rounded-md border px-1.5 py-0.5 font-mono text-[0.85em]",
          className,
        )}
      >
        {reference.path}
      </code>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={
          <button
            type="button"
            className={cn(
              "border-border/60 bg-muted/50 hover:bg-muted inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 align-baseline font-mono text-[0.85em] transition-colors",
              open && "bg-muted",
              className,
            )}
          />
        }
      >
        <FileText className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{reference.path}</span>
        {record.status !== "unchanged" ? (
          <span className="flex shrink-0 gap-1">
            <span className="text-green-600">+{record.additions}</span>
            <span className="text-red-600">−{record.deletions}</span>
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            "size-3 shrink-0 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-[2147483647]"
        >
          <Popover.Popup
            aria-label={`Changes in ${record.path}`}
            className="border-border bg-popover text-popover-foreground flex h-[min(420px,55vh)] min-h-0 w-[min(42rem,calc(100vw-2rem))] overflow-hidden rounded-xl border shadow-lg"
          >
            <LearnFileView
              record={record}
              displayMode={record.status === "unchanged" ? "source" : "diff"}
              variant="inline"
              onOpenInFiles={() => {
                setOpen(false);
                learnMode.openFile(
                  record.path,
                  record.status === "unchanged" ? "source" : "diff",
                );
              }}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
