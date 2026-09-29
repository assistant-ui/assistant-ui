"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Checkout } from "@/lib/checkout/protocol";

/** The agent's lines under an install step: open while the step runs, folded once it is done, unless the user toggled it. */
export function StepActivity({
  entries,
  live,
  agentName,
}: {
  entries: readonly Checkout.LogEntry[];
  /** The step is in progress, so new lines keep arriving. */
  live: boolean;
  agentName: string;
}) {
  const [toggled, setToggled] = useState<boolean>();
  const open = toggled ?? live;
  const list = useRef<HTMLOListElement>(null);
  const last = entries.at(-1)?.id;
  useEffect(() => {
    const element = list.current;
    if (!open || element === null) return;
    element.scrollTop = element.scrollHeight;
  }, [open, last]);
  const count = entries.length;
  return (
    <Collapsible open={open} onOpenChange={setToggled}>
      <CollapsibleTrigger className="text-muted-foreground hover:text-foreground group flex items-center gap-1.5 text-sm">
        {count} {count === 1 ? "line" : "lines"} from {agentName}
        <ChevronDownIcon className="size-3.5 transition-transform group-data-[panel-open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <ol
          ref={list}
          role="log"
          aria-live={live ? "polite" : "off"}
          aria-label={`What ${agentName} did`}
          className="bg-muted motion-safe:animate-in motion-safe:fade-in flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-lg p-3 text-sm motion-safe:duration-300"
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
