"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Checkout } from "@/lib/checkout/protocol";
import { cn } from "@/lib/utils";

/** The agent's lines under an install step: open while the step runs, folded once it is done, unless the user toggled it. */
export function StepActivity({
  entries,
  live,
  agentName,
  stepTitle,
}: {
  entries: readonly Checkout.LogEntry[];
  /** The step is in progress, so new lines keep arriving. */
  live: boolean;
  agentName: string;
  /** Read after the visible label, so the disclosures of two steps with the same line count still read apart. */
  stepTitle: string;
}) {
  const [toggled, setToggled] = useState<boolean>();
  const count = entries.length;
  const empty = count === 0;
  // Screen readers only announce changes to a live region that already existed, so the log is mounted, empty and hidden, before the first line.
  const open = empty || (toggled ?? live);
  const list = useRef<HTMLOListElement>(null);
  const pinned = useRef(true);
  const last = entries.at(-1)?.id;
  useEffect(() => {
    if (open) pinned.current = true;
  }, [open]);
  useEffect(() => {
    const element = list.current;
    if (!open || element === null || !pinned.current) return;
    element.scrollTop = element.scrollHeight;
  }, [open, last]);
  return (
    <Collapsible
      open={open}
      onOpenChange={setToggled}
      className={cn(!empty && "mt-3")}
    >
      {empty ? null : (
        <CollapsibleTrigger className="text-muted-foreground hover:text-foreground group flex items-center gap-1.5 text-sm">
          {count} {count === 1 ? "line" : "lines"} from {agentName}{" "}
          <span className="sr-only">for {stepTitle}</span>
          <ChevronDownIcon className="size-3.5 transition-transform group-data-[panel-open]:rotate-180" />
        </CollapsibleTrigger>
      )}
      <CollapsibleContent className={cn(!empty && "mt-2")}>
        <ol
          ref={list}
          role="log"
          aria-live={live ? "polite" : "off"}
          aria-label={`What ${agentName} did`}
          onScroll={(event) => {
            const { scrollHeight, scrollTop, clientHeight } =
              event.currentTarget;
            pinned.current = scrollHeight - scrollTop - clientHeight < 8;
          }}
          className={
            empty
              ? "sr-only"
              : "bg-muted motion-safe:animate-in motion-safe:fade-in flex max-h-40 flex-col gap-1.5 overflow-y-auto overscroll-y-contain rounded-lg p-3 text-sm motion-safe:duration-300"
          }
        >
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="text-muted-foreground [overflow-wrap:anywhere] whitespace-pre-wrap"
            >
              {entry.text}
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}
