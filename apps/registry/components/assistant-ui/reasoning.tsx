"use client";

import type { ReasoningMessagePartComponent } from "@assistant-ui/react";
import { TextMessagePartProvider } from "@assistant-ui/react";
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import { memo, useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { cn } from "@/lib/utils";

const getThinkingMessage = (isStreaming: boolean, duration?: number) => (
  <p>
    {isStreaming
      ? "Thinking..."
      : duration
        ? `Thought for ${duration > 2 ? `${duration} seconds` : `a moment`}`
        : "Thought for a few seconds"}
  </p>
);

const ReasoningComponent: ReasoningMessagePartComponent = ({
  text,
  status,
  duration,
}) => {
  const isStreaming = status.type === "running";
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible
      className={cn("aui-reasoning-root mb-4 w-full")}
      open={isOpen}
      onOpenChange={setIsOpen}
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
        className={cn(
          "aui-reasoning-content mt-4 overflow-hidden text-sm text-muted-foreground outline-none",
          "group/collapsible-content",
          "data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
          "data-[state=closed]:fill-mode-forwards",
          "data-[state=closed]:pointer-events-none",
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
          )}
        >
          <TextMessagePartProvider text={text} isRunning={isStreaming}>
            <MarkdownText />
          </TextMessagePartProvider>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const Reasoning = memo(ReasoningComponent);
Reasoning.displayName = "Reasoning";
