"use client";

import { type ReasoningMessagePartComponent } from "@assistant-ui/react";
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import {
  memo,
  useState,
  useRef,
  type RefObject,
  type FC,
  type PropsWithChildren,
} from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { cn } from "@/lib/utils";

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
const useScrollLock = <T extends HTMLElement = HTMLElement>(
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

/**
 * Renders a single reasoning part's text, consecutive parts are grouped as children of ReasoningGroup collapsible.
 */
const ReasoningComponent: ReasoningMessagePartComponent = () => {
  return <MarkdownText />;
};

export const Reasoning = memo(ReasoningComponent);
Reasoning.displayName = "Reasoning";

/**
 * Collapsible wrapper for reasoning parts
 */
const ReasoningGroupComponent: FC<PropsWithChildren> = ({ children }) => {
  const ANIMATION_DURATION = 200;
  const collapsibleRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const lockScroll = useScrollLock(collapsibleRef, ANIMATION_DURATION);

  const lockScrollWhenClosing = (open: boolean) => {
    if (!open) {
      lockScroll();
    }
    setIsOpen(open);
  };

  return (
    <Collapsible
      ref={collapsibleRef}
      className="aui-reasoning-root mb-4 w-full"
      open={isOpen}
      onOpenChange={lockScrollWhenClosing}
      style={
        {
          "--reasoning-duration": `${ANIMATION_DURATION}ms`,
        } as React.CSSProperties
      }
    >
      <CollapsibleTrigger
        className={cn(
          "aui-reasoning-trigger -mb-2 flex w-full items-center gap-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
        )}
      >
        <BrainIcon className="size-4" />
        <p>Reasoning</p>
        <ChevronDownIcon
          className={cn(
            "size-4 transition-transform duration-(--reasoning-duration) ease-out",
            isOpen ? "rotate-0" : "-rotate-90",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          "aui-reasoning-content relative overflow-hidden text-sm text-muted-foreground outline-none",
          "group/collapsible-content ease-out",
          "data-[state=closed]:animate-collapsible-up",
          "data-[state=open]:animate-collapsible-down",
          "data-[state=closed]:fill-mode-forwards",
          "data-[state=closed]:pointer-events-none",

          "data-[state=open]:duration-(--reasoning-duration)",
          "data-[state=closed]:duration-(--reasoning-duration)",
        )}
      >
        <div
          className={cn(
            "aui-reasoning-text relative z-0 space-y-4 pt-4 pl-6 leading-relaxed [&_p]:-mb-2",
            "transform-gpu transition-[transform,opacity]",
            "group-data-[state=open]/collapsible-content:animate-in",
            "group-data-[state=closed]/collapsible-content:animate-out",
            "group-data-[state=open]/collapsible-content:fade-in-0",
            "group-data-[state=closed]/collapsible-content:fade-out-0",

            "group-data-[state=open]/collapsible-content:slide-in-from-top-6",

            // higher value gets inner text too close to root element when closing, I think this matches opening slide in spacing better
            "group-data-[state=closed]/collapsible-content:slide-out-to-top-3",

            "group-data-[state=open]/collapsible-content:duration-(--reasoning-duration)",
            "group-data-[state=closed]/collapsible-content:duration-(--reasoning-duration)",
          )}
        >
          {children}
        </div>
        <div
          className={cn(
            "aui-reasoning-fade pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16",
            "bg-[linear-gradient(to_top,var(--color-background),transparent)]",
            "animate-in fade-in-0",
            "group-data-[state=open]/collapsible-content:animate-out",
            "group-data-[state=open]/collapsible-content:fade-out-0",
            "group-data-[state=open]/collapsible-content:delay-[calc(var(--reasoning-duration)*0.75)]", // calculate delay based on duration
            "group-data-[state=open]/collapsible-content:fill-mode-forwards",

            "duration-(--reasoning-duration)",
            "group-data-[state=open]/collapsible-content:duration-(--reasoning-duration)",
          )}
        />
      </CollapsibleContent>
    </Collapsible>
  );
};

export const ReasoningGroup = memo(ReasoningGroupComponent);
ReasoningGroup.displayName = "ReasoningGroup";
