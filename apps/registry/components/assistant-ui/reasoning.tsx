"use client";

import { BrainIcon, ChevronDownIcon } from "lucide-react";
import {
  memo,
  useCallback,
  useRef,
  useState,
  type FC,
  type PropsWithChildren,
} from "react";

import {
  useScrollLock,
  useAssistantState,
  type ReasoningMessagePartComponent,
  type ReasoningGroupComponent,
} from "@assistant-ui/react";

import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const ANIMATION_DURATION = 200;
const SHIMMER_DURATION = 1000;

/**
 * Root collapsible container that manages open/closed state and scroll lock.
 * Provides animation timing via CSS variable and prevents scroll jumps on collapse.
 */
const ReasoningRoot: FC<
  PropsWithChildren<{
    className?: string;
  }>
> = ({ className, children }) => {
  const collapsibleRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const lockScroll = useScrollLock(collapsibleRef, ANIMATION_DURATION);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        lockScroll();
      }
      setIsOpen(open);
    },
    [lockScroll],
  );

  return (
    <Collapsible
      ref={collapsibleRef}
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn("aui-reasoning-root mb-4 w-full", className)}
      style={
        {
          "--animation-duration": `${ANIMATION_DURATION}ms`,
          "--shimmer-duration": `${SHIMMER_DURATION}ms`,
        } as React.CSSProperties
      }
    >
      {children}
    </Collapsible>
  );
};

ReasoningRoot.displayName = "ReasoningRoot";

/**
 * Gradient overlay that softens the bottom edge during expand/collapse animations.
 * Animation: Fades out with delay when opening and fades back in when closing.
 */
const GradientFade: FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      "aui-reasoning-fade pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16",
      "bg-[linear-gradient(to_top,var(--color-background),transparent)]",
      "animate-in fade-in-0",
      "group-data-[state=open]/collapsible-content:animate-out",
      "group-data-[state=open]/collapsible-content:fade-out-0",
      "group-data-[state=open]/collapsible-content:delay-[calc(var(--animation-duration)*0.75)]", // calc for timing the delay
      "group-data-[state=open]/collapsible-content:fill-mode-forwards",
      "duration-(--animation-duration)",
      "group-data-[state=open]/collapsible-content:duration-(--animation-duration)",
      className,
    )}
  />
);

/**
 * Trigger button for the Reasoning collapsible.
 * Composed of icons, label, and text shimmer animation when reasoning is being streamed.
 */
const ReasoningTrigger: FC<{ active: boolean; className?: string }> = ({
  active,
  className,
}) => (
  <CollapsibleTrigger
    className={cn(
      "aui-reasoning-trigger group/trigger -mb-2 flex max-w-[75%] items-center gap-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
      className,
    )}
  >
    <BrainIcon className="aui-reasoning-trigger-icon size-4 shrink-0" />
    <span className="aui-reasoning-trigger-label-wrapper relative inline-block leading-none">
      <span>Reasoning</span>
      {active ? (
        <span
          aria-hidden
          className={cn(
            "aui-reasoning-trigger-shimmer pointer-events-none absolute inset-0 bg-clip-text bg-no-repeat text-transparent motion-reduce:animate-none",
            "animate-shimmer will-change-[background-position]",
            "bg-size-[200%_100%]",
            "bg-[linear-gradient(90deg,transparent_0%,transparent_40%,color-mix(in_oklch,var(--foreground)_75%,transparent)_56%,transparent_80%,transparent_100%)]",
          )}
        >
          Reasoning
        </span>
      ) : null}
    </span>
    <ChevronDownIcon
      className={cn(
        "aui-reasoning-trigger-chevron mt-0.5 size-4 shrink-0",
        "transition-transform duration-(--animation-duration) ease-out",
        "group-data-[state=closed]/trigger:-rotate-90",
        "group-data-[state=open]/trigger:rotate-0",
      )}
    />
  </CollapsibleTrigger>
);

/**
 * Collapsible content wrapper that handles height expand/collapse animation.
 * Animation: Height animates up (collapse) and down (expand).
 * Also provides group context for child animations via data-state attributes.
 */
const ReasoningContent: FC<
  PropsWithChildren<{
    className?: string;
    "aria-busy"?: boolean;
  }>
> = ({ className, children, "aria-busy": ariaBusy }) => (
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
    aria-busy={ariaBusy}
  >
    {children}
    <GradientFade />
  </CollapsibleContent>
);

ReasoningContent.displayName = "ReasoningContent";

/**
 * Text content wrapper that animates the reasoning text visibility.
 * Animation: Slides in from top + fades in when opening, reverses when closing.
 * Reacts to parent ReasoningContent's data-state via Radix group selectors.
 */
const ReasoningText: FC<
  PropsWithChildren<{
    className?: string;
  }>
> = ({ className, children }) => (
  <div
    className={cn(
      "aui-reasoning-text relative z-0 space-y-4 pt-4 pl-6 leading-relaxed",
      "transform-gpu transition-[transform,opacity]",
      "group-data-[state=open]/collapsible-content:animate-in",
      "group-data-[state=closed]/collapsible-content:animate-out",
      "group-data-[state=open]/collapsible-content:fade-in-0",
      "group-data-[state=closed]/collapsible-content:fade-out-0",
      "group-data-[state=open]/collapsible-content:slide-in-from-top-4",
      "group-data-[state=closed]/collapsible-content:slide-out-to-top-4",
      "group-data-[state=open]/collapsible-content:duration-(--animation-duration)",
      "group-data-[state=closed]/collapsible-content:duration-(--animation-duration)",
      "[&_p]:-mb-2",
      className,
    )}
  >
    {children}
  </div>
);

ReasoningText.displayName = "ReasoningText";

/**
 * Renders a single reasoning part's text with markdown support.
 * Consecutive reasoning parts are automatically grouped by ReasoningGroup.
 *
 * Pass Reasoning to MessagePrimitive.Parts in thread.tsx
 *
 * @example:
 * ```tsx
 * <MessagePrimitive.Parts
 *   components={{
 *     Reasoning: Reasoning,
 *     ReasoningGroup: ReasoningGroup,
 *   }}
 * />
 * ```
 */
const ReasoningImpl: ReasoningMessagePartComponent = () => <MarkdownText />;

/**
 * Collapsible wrapper that groups consecutive reasoning parts together.
 *  Includes scroll lock to prevent page jumps during collapse animation.
 *
 *  Pass ReasoningGroup to MessagePrimitive.Parts in thread.tsx
 *
 * @example:
 * ```tsx
 * <MessagePrimitive.Parts
 *   components={{
 *     Reasoning: Reasoning,
 *     ReasoningGroup: ReasoningGroup,
 *   }}
 * />
 * ```
 */
const ReasoningGroupImpl: ReasoningGroupComponent = ({
  children,
  startIndex,
  endIndex,
}) => {
  /**
   * Detects if reasoning is currently streaming within this group's range.
   */
  const isReasoningStreaming = useAssistantState(({ message }) => {
    if (message.status?.type !== "running") return false;
    const lastIndex = message.parts.length - 1;
    if (lastIndex < 0) return false;
    const lastType = message.parts[lastIndex]?.type;
    if (lastType !== "reasoning") return false;
    return lastIndex >= startIndex && lastIndex <= endIndex;
  });

  return (
    <ReasoningRoot>
      <ReasoningTrigger active={isReasoningStreaming} />

      <ReasoningContent aria-busy={isReasoningStreaming}>
        <ReasoningText>{children}</ReasoningText>
      </ReasoningContent>
    </ReasoningRoot>
  );
};

export const Reasoning = memo(ReasoningImpl);
Reasoning.displayName = "Reasoning";

export const ReasoningGroup = memo(ReasoningGroupImpl);
ReasoningGroup.displayName = "ReasoningGroup";
