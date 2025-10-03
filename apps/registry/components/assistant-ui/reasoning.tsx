"use client";

import { useMessagePartReasoning } from "@assistant-ui/react";
import { ChevronDownIcon } from "lucide-react";
import { type FC, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export const Reasoning: FC = () => {
  const { text, status } = useMessagePartReasoning();

  const [open, setOpen] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  // Auto-expand when streaming, auto-collapse when complete
  useEffect(() => {
    if (status.type === "running") {
      setOpen(true);
    } else if (status.type === "complete") {
      setOpen(false);
    }
  }, [status.type]);

  // Track duration of reasoning
  useEffect(() => {
    if (status.type === "running" && !startTimeRef.current) {
      startTimeRef.current = Date.now();
    } else if (status.type !== "running" && startTimeRef.current) {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setDuration(elapsed);
      startTimeRef.current = null;
    }
  }, [status.type]);

  const isStreaming = status.type === "running";

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="aui-reasoning-root w-full"
    >
      <div className="aui-reasoning-trigger flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Reasoning</span>
          {isStreaming && (
            <div className="flex items-center gap-1">
              <div className="size-2 animate-pulse rounded-full bg-primary" />
            </div>
          )}
          {status.type === "complete" && duration !== null && (
            <span className="text-xs text-muted-foreground">
              {duration.toFixed(1)}s
            </span>
          )}
        </div>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 [&[data-state=open]>svg]:rotate-180"
          >
            <ChevronDownIcon className="size-4 transition-transform duration-200" />
            <span className="sr-only">Toggle reasoning</span>
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="aui-reasoning-content">
        <div className="pt-2 text-sm text-muted-foreground whitespace-pre-wrap">
          {text}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
