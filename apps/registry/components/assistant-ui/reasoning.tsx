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
import { cn } from "@/lib/utils";

type ReasoningRootProps = {
  isStreaming: boolean;
  children: React.ReactNode;
  className?: string;
};

const ReasoningRoot: FC<ReasoningRootProps> = ({
  isStreaming,
  children,
  className,
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isStreaming) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [isStreaming]);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn("aui-reasoning-root", className)}
    >
      {children}
    </Collapsible>
  );
};

type ReasoningTriggerProps = {
  title?: string;
  isStreaming: boolean;
  duration: number | null;
  status: { type: string; reason?: string };
};

const ReasoningTrigger: FC<ReasoningTriggerProps> = ({
  title = "Reasoning",
  isStreaming,
  duration,
  status,
}) => {
  return (
    <div className="aui-reasoning-trigger flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{title}</span>
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
          <span className="sr-only">Toggle {title}</span>
        </Button>
      </CollapsibleTrigger>
    </div>
  );
};

const ReasoningContentContainer: FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <CollapsibleContent className="aui-reasoning-content">
      <div className="pt-2 text-sm text-muted-foreground whitespace-pre-wrap">
        {children}
      </div>
    </CollapsibleContent>
  );
};

export const Reasoning: FC = () => {
  const { text, status } = useMessagePartReasoning();

  const startTimeRef = useRef<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

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
    <ReasoningRoot isStreaming={isStreaming} className="w-full">
      <ReasoningTrigger
        isStreaming={isStreaming}
        duration={duration}
        status={status}
      />
      <ReasoningContentContainer>{text}</ReasoningContentContainer>
    </ReasoningRoot>
  );
};
