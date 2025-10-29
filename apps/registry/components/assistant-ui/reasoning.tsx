"use client";

import type { ReasoningMessagePartComponent } from "@assistant-ui/react";
import { TextMessagePartProvider } from "@assistant-ui/react";
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import { memo, useRef, useState, type RefObject } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { cn } from "@/lib/utils";

const getThinkingMessage = (isStreaming: boolean, duration?: number) =>
  isStreaming
    ? "Thinking..."
    : duration
      ? `Thought for ${duration > 2 ? `${duration} seconds` : `a moment`}`
      : "Thought for a few seconds";

/**
 * Locks scroll position during collapsible/height animations and hides scrollbar.
 *
 * - Prevents forced reflows: no layout reads, mutations scoped to scrollable parent only
 * - Reactive: only intercepts scroll events when browser actually adjusts
 *
 * @param animatedElementRef - Ref to the animated element
 * @param animationDuration - Lock duration in milliseconds
 * @returns Function to activate the scroll lock
 */
const useScrollLock = <T extends HTMLElement>(
  animatedElementRef: RefObject<T | null>,
  animationDuration: number,
) => {
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  const lockScroll = () => {
    (function findScrollableAncestor() {
      if (scrollContainerRef.current || !animatedElementRef.current) return;

      let el: HTMLElement | null = animatedElementRef.current;
      while (el) {
        const { overflowY } = getComputedStyle(el);
        if (overflowY === "scroll" || overflowY === "auto") {
          scrollContainerRef.current = el;
          break;
        }
        el = el.parentElement;
      }
    })();

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const scrollPosition = scrollContainer.scrollTop;
    const scrollbarWidth = scrollContainer.style.scrollbarWidth;

    scrollContainer.style.scrollbarWidth = "none";

    const resetPosition = () => (scrollContainer.scrollTop = scrollPosition);
    scrollContainer.addEventListener("scroll", resetPosition);

    setTimeout(() => {
      scrollContainer.removeEventListener("scroll", resetPosition);
      scrollContainer.style.scrollbarWidth = scrollbarWidth;
    }, animationDuration);
  };

  return lockScroll;
};

const ReasoningComponent: ReasoningMessagePartComponent = ({
  text,
  status,
  duration,
}) => {
  const isStreaming = status.type === "running";
  const [isOpen, setIsOpen] = useState(false);
  const collapsibleRef = useRef<HTMLDivElement>(null);

  // Prevent scroll jump when collapsing makes page shorter than viewport
  const lockScroll = useScrollLock(collapsibleRef, 200);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      lockScroll();
    }
    setIsOpen(open);
  };

  return (
    <Collapsible
      ref={collapsibleRef}
      className={cn("aui-reasoning-root mb-4 w-full")}
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <CollapsibleTrigger
        className={cn(
          "aui-reasoning-trigger -mb-2 flex w-full items-center gap-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
        )}
      >
        <BrainIcon className="size-4" />
        {getThinkingMessage(isStreaming, duration)}
        <ChevronDownIcon
          className={cn(
            "size-4 transition-transform ease-out",
            isOpen ? "rotate-0" : "-rotate-90",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          "aui-reasoning-content relative overflow-hidden text-sm text-muted-foreground outline-none",
          "group/collapsible-content",
          "data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
          "data-[state=closed]:fill-mode-forwards",
          "data-[state=closed]:pointer-events-none",
        )}
      >
        <div
          className={cn(
            "aui-reasoning-text relative z-0 pt-4 pl-6 leading-relaxed",
            "transform-gpu transition-[transform,opacity] ease-out",
            "group-data-[state=open]/collapsible-content:animate-in",
            "group-data-[state=closed]/collapsible-content:animate-out",
            "group-data-[state=open]/collapsible-content:fade-in-0",
            "group-data-[state=closed]/collapsible-content:fade-out-0",
            "group-data-[state=open]/collapsible-content:slide-in-from-top-6",
            "group-data-[state=closed]/collapsible-content:slide-out-to-top-6",
          )}
        >
          <TextMessagePartProvider text={text} isRunning={isStreaming}>
            <MarkdownText />
          </TextMessagePartProvider>
        </div>
        <div
          className={cn(
            "aui-reasoning-fade pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16",
            "bg-[linear-gradient(to_top,var(--color-background),transparent)]",
            "animate-in fade-in-0",
            "group-data-[state=open]/collapsible-content:animate-out",
            "group-data-[state=open]/collapsible-content:fade-out-0",
            "group-data-[state=open]/collapsible-content:delay-150",
            "group-data-[state=open]/collapsible-content:fill-mode-forwards",
          )}
        />
      </CollapsibleContent>
    </Collapsible>
  );
};

export const Reasoning = memo(ReasoningComponent);
Reasoning.displayName = "Reasoning";
