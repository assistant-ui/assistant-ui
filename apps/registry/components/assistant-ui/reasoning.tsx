"use client";

import type { ReasoningMessagePartComponent } from "@assistant-ui/react";
import { TextMessagePartProvider } from "@assistant-ui/react";
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { cn } from "@/lib/utils";

const AUTO_CLOSE_DELAY = 1000;

const getThinkingMessage = (isStreaming: boolean, duration: number) => {
  if (isStreaming && duration === 0) {
    return <p>Thinking...</p>;
  }

  if (Number.isNaN(duration) || duration === 0) {
    return <p>Thought for a few seconds</p>;
  }

  return <p>Thought for {duration} seconds</p>;
};

const ReasoningComponent: ReasoningMessagePartComponent = ({
  text,
  status,
}) => {
  const isStreaming = status.type === "running";

  const [isOpen, setIsOpen] = useState(true);
  const [userInteracted, setUserInteracted] = useState(false);
  const [duration, setDuration] = useState(0);

  const startTimeRef = useRef<number | null>(null);
  const autoCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const prevStreamingRef = useRef(isStreaming);

  const { fallbackText, hasReasoning } = useMemo(() => {
    const trimmed = (text || "").trim();
    if (trimmed.length === 0) {
      return {
        fallbackText: isStreaming
          ? "The model is still working through its reasoning."
          : "No reasoning was provided for this response.",
        hasReasoning: false,
      } as const;
    }

    return {
      fallbackText: "",
      hasReasoning: true,
    } as const;
  }, [isStreaming, text]);

  useEffect(() => {
    const wasStreaming = prevStreamingRef.current;
    prevStreamingRef.current = isStreaming;

    // Clear any pending auto-close timeout
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }

    // Only act on streaming state CHANGES
    if (isStreaming && !wasStreaming) {
      // Streaming just started: auto-open and reset
      setIsOpen(true);
      setUserInteracted(false);
      setDuration(0);
      startTimeRef.current = Date.now();
    } else if (!isStreaming && wasStreaming) {
      // Streaming just ended: calculate duration and auto-close
      if (startTimeRef.current !== null) {
        const elapsed = Math.ceil((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
        startTimeRef.current = null;
      }

      if (!userInteracted) {
        autoCloseTimeoutRef.current = setTimeout(() => {
          setIsOpen(false);
        }, AUTO_CLOSE_DELAY);
      }
    }
  }, [isStreaming, userInteracted]);

  const handleOpenChange = (nextOpen: boolean) => {
    setIsOpen(nextOpen);
    setUserInteracted(true);
    // Clear auto-close when user manually toggles
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }
  };

  return (
    <Collapsible
      className={cn("aui-reasoning-root w-full")}
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <CollapsibleTrigger
        className={cn(
          "aui-reasoning-trigger flex w-full items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
        )}
      >
        <BrainIcon className="size-4" />
        {getThinkingMessage(isStreaming, duration)}
        <ChevronDownIcon
          className={cn(
            "size-4 transition-transform",
            isOpen ? "rotate-180" : "rotate-0",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent
        forceMount
        className={cn(
          "aui-reasoning-content mt-4 overflow-hidden text-sm text-muted-foreground outline-none",
          "group/collapsible-content",
          "data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
          "data-[state=closed]:fill-mode-forwards",
          "data-[state=closed]:pointer-events-none",
          "[&_p]:last:mb-4",
        )}
      >
        <div
          className={cn(
            "aui-reasoning-text leading-relaxed",
            "transform-gpu transition-all duration-200 ease-out",
            "group-data-[state=open]/collapsible-content:animate-in",
            "group-data-[state=closed]/collapsible-content:animate-out",
            "group-data-[state=open]/collapsible-content:fade-in-0",
            "group-data-[state=closed]/collapsible-content:fade-out-0",
            "group-data-[state=open]/collapsible-content:zoom-in-95",
            "group-data-[state=closed]/collapsible-content:zoom-out-95",
            "group-data-[state=open]/collapsible-content:slide-in-from-top-2",
            "group-data-[state=closed]/collapsible-content:slide-out-to-top-2",
          )}
        >
          {hasReasoning ? (
            <TextMessagePartProvider text={text} isRunning={isStreaming}>
              <MarkdownText />
            </TextMessagePartProvider>
          ) : (
            <p>{fallbackText}</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const Reasoning = memo(ReasoningComponent);
Reasoning.displayName = "Reasoning";
