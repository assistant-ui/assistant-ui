"use client";

import { type ReasoningMessagePartComponent } from "@assistant-ui/react";
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import {
  memo,
  useState,
  useRef,
  useContext,
  createContext,
  useMemo,
  useCallback,
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
 * Strips markdown syntax and returns the first non-empty line of text
 */
const getFirstLineFromText = (text: string): string => {
  if (!text) return "Reasoning Part";

  // Split by newlines and find first non-empty line
  const lines = text.split(/\r?\n/);
  const firstNonEmptyLine = lines.find((line) => line.trim().length > 0);

  if (!firstNonEmptyLine) return "Reasoning Part";

  // Strip markdown syntax
  let cleaned = firstNonEmptyLine.trim();

  // Remove headers (# ## ### etc.)
  cleaned = cleaned.replace(/^#{1,6}\s+/, "");

  // Remove bold (**text** or __text__)
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1");
  cleaned = cleaned.replace(/__(.*?)__/g, "$1");

  // Remove italic (*text* or _text_)
  cleaned = cleaned.replace(/\*(.*?)\*/g, "$1");
  cleaned = cleaned.replace(/_(.*?)_/g, "$1");

  // Remove links [text](url)
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

  // Remove inline code `code`
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // Remove code blocks (```code```)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");

  // Remove list markers (- * +)
  cleaned = cleaned.replace(/^[-*+]\s+/, "");

  // Remove numbered list markers (1. 2. etc.)
  cleaned = cleaned.replace(/^\d+\.\s+/, "");

  // Remove blockquotes (>)
  cleaned = cleaned.replace(/^>\s+/, "");

  // Remove horizontal rules (---)
  cleaned = cleaned.replace(/^-{3,}$/, "");

  // Clean up any remaining markdown characters
  cleaned = cleaned.replace(/\*\*|\*\s*|\_\_|\_\s*/g, "");

  // Trim and return, or fallback
  cleaned = cleaned.trim();
  return cleaned || "Reasoning Part";
};

/**
 * Compound component primitives for building composable reasoning collapsibles.
 * Provides Root, Trigger, Content, Fade, Chevron, and Text components.
 */
export namespace ReasoningCollapsible {
  type RootProps = PropsWithChildren<{
    className?: string;
    onOpenChange?: (open: boolean) => void;
  }>;

  type Ctx = {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    collapsibleRef: RefObject<HTMLDivElement | null>;
  };
  const Context = createContext<Ctx | null>(null);

  export const useCtx = () => {
    const ctx = useContext(Context);
    if (!ctx)
      throw new Error("ReasoningCollapsible.* must be used within Root");
    return ctx;
  };

  export const Root: FC<RootProps> = ({
    className,
    onOpenChange,
    children,
  }) => {
    const ANIMATION_DURATION = 200;
    const collapsibleRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const lockScroll = useScrollLock(collapsibleRef, ANIMATION_DURATION);

    const handleOpenChange = useCallback(
      (open: boolean) => {
        if (!open) {
          lockScroll();
        }
        setIsOpen(open);
        onOpenChange?.(open);
      },
      [lockScroll, onOpenChange],
    );

    const contextValue = useMemo(
      () => ({
        isOpen,
        setIsOpen,
        collapsibleRef,
      }),
      [isOpen, setIsOpen, collapsibleRef],
    );

    return (
      <Context.Provider value={contextValue}>
        <Collapsible
          ref={collapsibleRef}
          open={isOpen}
          onOpenChange={handleOpenChange}
          className={cn("aui-reasoning-root mb-4 w-full", className)}
          style={
            {
              "--animation-duration": `${ANIMATION_DURATION}ms`,
            } as React.CSSProperties
          }
        >
          {children}
        </Collapsible>
      </Context.Provider>
    );
  };

  export const Trigger: FC<PropsWithChildren<{ className?: string }>> = ({
    className,
    children,
  }) => (
    <CollapsibleTrigger
      className={cn(
        "aui-reasoning-trigger -mb-2 flex w-full items-center gap-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      {children}
    </CollapsibleTrigger>
  );

  export const Fade: FC<{ className?: string }> = ({ className }) => {
    return (
      <div
        className={cn(
          "aui-reasoning-fade pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16",
          "bg-[linear-gradient(to_top,var(--color-background),transparent)]",
          "animate-in fade-in-0",
          "group-data-[state=open]/collapsible-content:animate-out",
          "group-data-[state=open]/collapsible-content:fade-out-0",
          "group-data-[state=open]/collapsible-content:delay-[calc(var(--animation-duration)*0.75)]",
          "group-data-[state=open]/collapsible-content:fill-mode-forwards",
          "duration-(--animation-duration)",
          "group-data-[state=open]/collapsible-content:duration-(--animation-duration)",
          className,
        )}
      />
    );
  };

  export const Content: FC<PropsWithChildren<{ className?: string }>> = ({
    className,
    children,
  }) => {
    return (
      <CollapsibleContent
        className={cn(
          "aui-reasoning-content relative overflow-hidden text-sm text-muted-foreground outline-none",
          "group/collapsible-content ease-out",
          "data-[state=closed]:animate-collapsible-up",
          "data-[state=open]:animate-collapsible-down",
          "data-[state=closed]:fill-mode-forwards",
          "data-[state=closed]:pointer-events-none",
          "data-[state=open]:duration-(--animation-duration)",
          "data-[state=closed]:duration-(--animation-duration)",
          className,
        )}
      >
        {children}
        <Fade />
      </CollapsibleContent>
    );
  };

  export const Chevron: FC<{ className?: string }> = ({ className }) => {
    const { isOpen } = useCtx();
    return (
      <ChevronDownIcon
        className={cn(
          "size-4 transition-transform duration-(--animation-duration) ease-out",
          isOpen ? "rotate-0" : "-rotate-90",
          className,
        )}
      />
    );
  };

  export const Text: FC<{ className?: string }> = ({ className }) => (
    <div
      className={cn(
        "aui-reasoning-text relative z-0 space-y-4 pt-4 pl-6 leading-relaxed [&_p]:-mb-2",
        "transform-gpu transition-[transform,opacity]",
        "group-data-[state=open]/collapsible-content:animate-in",
        "group-data-[state=closed]/collapsible-content:animate-out",
        "group-data-[state=open]/collapsible-content:fade-in-0",
        "group-data-[state=closed]/collapsible-content:fade-out-0",
        "group-data-[state=open]/collapsible-content:slide-in-from-top-6",
        "group-data-[state=closed]/collapsible-content:slide-out-to-top-3",
        "group-data-[state=open]/collapsible-content:duration-(--animation-duration)",
        "group-data-[state=closed]/collapsible-content:duration-(--animation-duration)",
        className,
      )}
    >
      <MarkdownText />
    </div>
  );
}

/**
 * Renders a single reasoning part's text.
 * Consecutive reasoning parts are automatically grouped by ReasoningGroup.
 */
const ReasoningComponent: ReasoningMessagePartComponent = () => {
  return <MarkdownText />;
};

export const Reasoning = memo(ReasoningComponent);
Reasoning.displayName = "Reasoning";

/**
 * Self-contained collapsible reasoning component.
 */
const CollapsibleReasoningComponent: ReasoningMessagePartComponent = ({
  text,
}) => {
  const label = useMemo(() => getFirstLineFromText(text || ""), [text]);

  return (
    <ReasoningCollapsible.Root>
      <ReasoningCollapsible.Trigger>
        <span className="min-w-0 truncate text-left leading-none">{label}</span>
        <ReasoningCollapsible.Chevron />
      </ReasoningCollapsible.Trigger>
      <ReasoningCollapsible.Content>
        <ReasoningCollapsible.Text />
      </ReasoningCollapsible.Content>
    </ReasoningCollapsible.Root>
  );
};

export const CollapsibleReasoning = memo(CollapsibleReasoningComponent);
CollapsibleReasoning.displayName = "CollapsibleReasoning";

/**
 * Collapsible wrapper that groups consecutive reasoning parts together.
 */
const ReasoningGroupComponent: FC<PropsWithChildren> = ({ children }) => {
  return (
    <ReasoningCollapsible.Root>
      <ReasoningCollapsible.Trigger>
        <BrainIcon className="size-4" />
        <span className="leading-none">Reasoning</span>
        <ReasoningCollapsible.Chevron />
      </ReasoningCollapsible.Trigger>
      <ReasoningCollapsible.Content>
        <div
          className={cn(
            "aui-reasoning-text relative z-0 space-y-4 pt-4 pl-6 leading-relaxed [&_p]:-mb-2",
            "transform-gpu transition-[transform,opacity]",
            "group-data-[state=open]/collapsible-content:animate-in",
            "group-data-[state=closed]/collapsible-content:animate-out",
            "group-data-[state=open]/collapsible-content:fade-in-0",
            "group-data-[state=closed]/collapsible-content:fade-out-0",
            "group-data-[state=open]/collapsible-content:slide-in-from-top-6",
            "group-data-[state=closed]/collapsible-content:slide-out-to-top-3",
            "group-data-[state=open]/collapsible-content:duration-(--animation-duration)",
            "group-data-[state=closed]/collapsible-content:duration-(--animation-duration)",
          )}
        >
          {children}
        </div>
      </ReasoningCollapsible.Content>
    </ReasoningCollapsible.Root>
  );
};

export const ReasoningGroup = memo(ReasoningGroupComponent);
ReasoningGroup.displayName = "ReasoningGroup";
