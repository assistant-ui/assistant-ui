"use client";

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  memo,
  type ComponentType,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  BrainIcon,
  ChevronDownIcon,
  SearchIcon,
  ImageIcon,
  FileTextIcon,
  WrenchIcon,
  UsersIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ArrowDownIcon,
  RotateCcwIcon,
  type LucideIcon,
} from "lucide-react";
import {
  MessagePrimitive,
  useScrollLock,
  useAuiState,
  type ReasoningMessagePartComponent,
  type ReasoningGroupComponent,
  type ThreadMessage,
} from "@assistant-ui/react";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const ANIMATION_DURATION = 200;

/**
 * Smooth ease-out curve for refined, professional feel.
 * No overshoot - clean and crisp.
 */
const SPRING_EASING = "cubic-bezier(0.22, 0.61, 0.36, 1)";

/**
 * Material Design standard easing for crisp close animations.
 */
const EASE_OUT_EXPO = "cubic-bezier(0.4, 0, 0.2, 1)";

/**
 * Stagger delay between timeline steps (in ms).
 */
const STEP_STAGGER_DELAY = 40;
const WINDOW_TRANSITION_MS = 450;

/**
 * Step animation keyframes - injected once per document.
 * Uses clip-path for connector "line extension" and blur for focus effect.
 */
const STEP_KEYFRAMES = `
@keyframes aui-connector-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes aui-icon-enter {
  from {
    opacity: 0;
    transform: scale(0.85);
    filter: blur(3px);
  }
  to {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
}
@keyframes aui-content-enter {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes aui-window-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.aui-chain-of-thought-timeline[data-windowed="true"][data-window-shift="true"][data-window-transition="true"]
  [data-slot="chain-of-thought-step"]:last-child {
  animation: aui-window-enter 240ms ease-out both;
}
.aui-chain-of-thought-timeline-window[data-windowed="true"] {
  position: relative;
  overflow: hidden;
  max-height: calc(
    (var(--aui-window-row, 56px) * var(--aui-window-count, 3)) +
      var(--aui-window-padding, 0px)
  );
  transition: max-height ${WINDOW_TRANSITION_MS}ms ${SPRING_EASING};
}
.aui-chain-of-thought-timeline-window[data-windowed="true"][data-window-active="true"] {
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent,
    black 14%,
    black 86%,
    transparent
  );
  mask-image: linear-gradient(
    to bottom,
    transparent,
    black 14%,
    black 86%,
    transparent
  );
}
.aui-chain-of-thought-timeline-window[data-windowed="true"]::before,
.aui-chain-of-thought-timeline-window[data-windowed="true"]::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 24px;
  pointer-events: none;
  z-index: 1;
  opacity: 0;
  transition: opacity ${WINDOW_TRANSITION_MS}ms ${SPRING_EASING};
}
.aui-chain-of-thought-timeline-window[data-windowed="true"][data-window-active="true"]::before,
.aui-chain-of-thought-timeline-window[data-windowed="true"][data-window-active="true"]::after {
  opacity: 1;
}
.aui-chain-of-thought-timeline-window[data-windowed="true"]::before {
  top: 0;
  background: linear-gradient(
    to bottom,
    hsl(var(--background)),
    transparent
  );
}
.aui-chain-of-thought-timeline-window[data-windowed="true"]::after {
  bottom: 0;
  background: linear-gradient(
    to top,
    hsl(var(--background)),
    transparent
  );
}
.aui-chain-of-thought-timeline-window[data-windowed="true"][data-expanded="true"] {
  max-height: calc(
    (var(--aui-window-row, 56px) * var(--aui-window-total, 3)) +
      var(--aui-window-padding, 0px)
  );
  -webkit-mask-image: none;
  mask-image: none;
}
.aui-chain-of-thought-timeline-window[data-windowed="true"][data-expanded="true"][data-expand-animating="false"] {
  max-height: none;
  overflow: visible;
}
.aui-chain-of-thought-timeline-window[data-windowed="true"]:has([data-slot="chain-of-thought-trace-group-summary"][aria-expanded="true"]) {
  max-height: none;
  overflow: visible;
  -webkit-mask-image: none;
  mask-image: none;
  transition: none;
}
.aui-chain-of-thought-timeline-window[data-windowed="true"]:has([data-slot="chain-of-thought-trace-group-summary"][aria-expanded="true"])::before,
.aui-chain-of-thought-timeline-window[data-windowed="true"]:has([data-slot="chain-of-thought-trace-group-summary"][aria-expanded="true"])::after {
  opacity: 0;
}
.aui-chain-of-thought-timeline[data-windowed="true"] {
  transform: translateY(
    calc(var(--aui-window-shift, 0) * -1 * var(--aui-window-row, 56px))
  );
  transition: transform ${WINDOW_TRANSITION_MS}ms ${SPRING_EASING};
  will-change: transform;
}
.aui-chain-of-thought-timeline[data-windowed="true"]:has([data-slot="chain-of-thought-trace-group-summary"][aria-expanded="true"]) {
  transform: none;
  transition: none;
}
.aui-chain-of-thought-timeline[data-windowed="true"][data-expanded="true"] {
  transform: none;
}
.aui-chain-of-thought-timeline[data-windowed="true"][data-window-transition="false"] {
  transition: none;
}
.aui-chain-of-thought-timeline-window[data-windowed="true"][data-window-transition="false"] {
  transition: none;
}
.aui-chain-of-thought-timeline-window[data-windowed="true"][data-window-transition="false"]::before,
.aui-chain-of-thought-timeline-window[data-windowed="true"][data-window-transition="false"]::after {
  transition: none;
}
.aui-chain-of-thought-timeline[data-windowed="true"] [data-slot="chain-of-thought-step"] {
  height: var(--aui-window-row, 56px);
  align-items: flex-start;
  overflow: hidden;
}
.aui-chain-of-thought-timeline[data-windowed="true"]:has([data-slot="chain-of-thought-trace-group-summary"][aria-expanded="true"]) [data-slot="chain-of-thought-step"] {
  height: auto;
  align-items: flex-start;
  overflow: visible;
}
.aui-chain-of-thought-timeline[data-windowed="true"] [data-slot="chain-of-thought-step-content"] {
  max-height: calc(var(--aui-window-row, 56px) - 12px);
  overflow: hidden;
}
.aui-chain-of-thought-timeline[data-windowed="true"]:has([data-slot="chain-of-thought-trace-group-summary"][aria-expanded="true"]) [data-slot="chain-of-thought-step-content"] {
  max-height: none;
  overflow: visible;
}
@media (prefers-reduced-motion: reduce) {
  .aui-chain-of-thought-timeline[data-windowed="true"][data-window-shift="true"][data-window-transition="true"]
    [data-slot="chain-of-thought-step"]:last-child,
  .aui-chain-of-thought-timeline,
  .aui-chain-of-thought-timeline-window,
  .aui-chain-of-thought-timeline-wrapper {
    animation: none !important;
    transition: none !important;
  }
}
`;

let keyframesInjected = false;
function injectStepKeyframes() {
  if (typeof document === "undefined") return;
  const existing = document.getElementById("aui-chain-of-thought-keyframes");
  if (existing) {
    if (existing.textContent !== STEP_KEYFRAMES) {
      existing.textContent = STEP_KEYFRAMES;
    }
    keyframesInjected = true;
    return;
  }
  if (keyframesInjected) return;
  const style = document.createElement("style");
  style.id = "aui-chain-of-thought-keyframes";
  style.textContent = STEP_KEYFRAMES;
  document.head.appendChild(style);
  keyframesInjected = true;
}

/**
 * Map of step types to their default icons.
 * Extend this record to add custom step types.
 * Note: "default" is handled specially with a small bullet dot.
 */
const stepTypeIcons = {
  search: SearchIcon,
  image: ImageIcon,
  text: FileTextIcon,
  tool: WrenchIcon,
  complete: CheckCircleIcon,
  error: AlertCircleIcon,
  default: null, // Uses BulletDot component instead
} as const satisfies Record<string, LucideIcon | null>;

/**
 * Small muted bullet dot for default/non-tool steps.
 * More subtle than the full icons used for tool calls.
 */
function BulletDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "aui-chain-of-thought-bullet-dot size-1.5 rounded-full bg-current",
        className,
      )}
    />
  );
}

export type StepType = keyof typeof stepTypeIcons;
export type StepStatus = "pending" | "active" | "complete" | "error";

export type TraceStatus = "running" | "complete" | "incomplete" | "error";

export type TraceOutputStatus = "streaming" | "complete";

export type TraceStepOutput =
  | ReactNode
  | {
      content: ReactNode;
      status?: TraceOutputStatus;
    };

export type TraceStep = {
  kind: "step";
  id: string;
  label?: ReactNode;
  type?: StepType;
  status?: TraceStatus;
  toolName?: string;
  detail?: ReactNode;
  output?: TraceStepOutput;
  meta?: Record<string, unknown>;
};

export type TraceGroup = {
  kind: "group";
  id: string;
  label: string;
  status?: TraceStatus;
  summary?: {
    latestLabel?: ReactNode;
    latestType?: StepType;
    toolName?: string;
  };
  children: TraceNode[];
  variant?: "subagent" | "default";
  meta?: Record<string, unknown>;
};

export type TraceNode = TraceStep | TraceGroup;

type TraceSummaryStats = {
  totalSteps: number;
  searchSteps: number;
  toolSteps: number;
};

type TraceSummaryFormatter = (
  stats: TraceSummaryStats & {
    durationSec?: number;
  },
) => string;

const summarizeTraceStats = (
  stats: TraceSummaryStats,
  durationSec?: number,
) => {
  const baseLabel =
    stats.searchSteps > 0
      ? `Researched ${stats.searchSteps} source${stats.searchSteps === 1 ? "" : "s"}`
      : stats.toolSteps > 0
        ? `Ran ${stats.toolSteps} tool${stats.toolSteps === 1 ? "" : "s"}`
        : `Completed ${stats.totalSteps} step${stats.totalSteps === 1 ? "" : "s"}`;
  return durationSec ? `${baseLabel} (${durationSec}s)` : baseLabel;
};

const collectTraceStats = (nodes: TraceNode[]): TraceSummaryStats => {
  let totalSteps = 0;
  let searchSteps = 0;
  let toolSteps = 0;

  const visit = (node: TraceNode) => {
    if (node.kind === "step") {
      totalSteps += 1;
      const toolName = node.toolName ?? "";
      const isSearch =
        node.type === "search" || toolName.toLowerCase().includes("search");
      const isTool = node.type === "tool" || toolName.length > 0;
      if (isSearch) searchSteps += 1;
      if (isTool) toolSteps += 1;
      return;
    }

    node.children.forEach(visit);
  };

  nodes.forEach(visit);
  return { totalSteps, searchSteps, toolSteps };
};

const traceHasRunning = (nodes: TraceNode[]): boolean => {
  for (const node of nodes) {
    if (node.kind === "step") {
      if (node.status === "running") return true;
      continue;
    }
    if (node.status === "running") return true;
    if (traceHasRunning(node.children)) return true;
  }
  return false;
};

const chainOfThoughtVariants = cva("aui-chain-of-thought-root mb-4 w-full", {
  variants: {
    variant: {
      outline: "rounded-lg border bg-background px-3 py-2",
      ghost: "bg-transparent",
      muted: "rounded-lg bg-muted px-3 py-2 dark:bg-card",
    },
  },
  defaultVariants: {
    variant: "outline",
  },
});

const stepVariants = cva(
  cn(
    "aui-chain-of-thought-step relative flex items-start gap-3 py-1.5",
    // Prevent blur filter clipping during entrance animation
    "overflow-visible",
    // Stagger delay passed to children via CSS variable
    "[--step-delay:calc(var(--step-index,0)*var(--step-stagger-delay,40ms))]",
  ),
  {
    variants: {
      status: {
        pending: "",
        active: "",
        complete: "",
        error: "",
      },
    },
    defaultVariants: {
      status: "complete",
    },
  },
);

export type ChainOfThoughtRootProps = Omit<
  React.ComponentProps<typeof Collapsible>,
  "open" | "onOpenChange"
> &
  VariantProps<typeof chainOfThoughtVariants> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    defaultOpen?: boolean;
  };

/**
 * Root container for chain-of-thought reasoning display.
 * Wraps content in a collapsible disclosure with variant styling.
 */
function ChainOfThoughtRoot({
  className,
  variant,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultOpen = false,
  children,
  ...props
}: ChainOfThoughtRootProps) {
  const collapsibleRef = useRef<HTMLDivElement>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const lockScroll = useScrollLock(collapsibleRef, ANIMATION_DURATION);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;
  const previousOpenRef = useRef(isOpen);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) lockScroll();
      if (!isControlled) setUncontrolledOpen(open);
      controlledOnOpenChange?.(open);
    },
    [lockScroll, isControlled, controlledOnOpenChange],
  );

  // Ensure scroll lock applies to programmatic closes (controlled mode) too.
  useLayoutEffect(() => {
    if (previousOpenRef.current && !isOpen) {
      lockScroll();
    }
    previousOpenRef.current = isOpen;
  }, [isOpen, lockScroll]);

  return (
    <Collapsible
      ref={collapsibleRef}
      data-slot="chain-of-thought-root"
      data-variant={variant}
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn(
        "group/chain-of-thought-root",
        chainOfThoughtVariants({ variant, className }),
      )}
      style={
        {
          "--animation-duration": `${ANIMATION_DURATION}ms`,
          "--spring-easing": SPRING_EASING,
          "--ease-out-expo": EASE_OUT_EXPO,
          "--step-stagger-delay": `${STEP_STAGGER_DELAY}ms`,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </Collapsible>
  );
}

export type ChainOfThoughtTriggerProps = React.ComponentProps<
  typeof CollapsibleTrigger
> & {
  /** Whether the reasoning is actively streaming */
  active?: boolean;
  /** Duration in seconds to display in the label */
  duration?: number;
  /** Label to display. Defaults to "Reasoning". */
  label?: string;
};

/**
 * Clickable trigger that toggles the chain-of-thought disclosure.
 * Displays a brain icon, label, and chevron indicator.
 */
function ChainOfThoughtTrigger({
  active,
  duration,
  label = "Reasoning",
  className,
  ...props
}: ChainOfThoughtTriggerProps) {
  const displayLabel = duration ? `${label} (${duration}s)` : label;

  return (
    <CollapsibleTrigger
      data-slot="chain-of-thought-trigger"
      className={cn(
        "aui-chain-of-thought-trigger",
        "group/trigger flex w-full items-start gap-3 py-1 text-left",
        "text-muted-foreground text-sm transition-colors hover:text-foreground",
        className,
      )}
      {...props}
    >
      <span
        data-slot="chain-of-thought-trigger-icon-wrapper"
        className="aui-chain-of-thought-trigger-icon-wrapper flex size-6 shrink-0 items-center justify-center"
      >
        <BrainIcon
          data-slot="chain-of-thought-trigger-icon"
          className="aui-chain-of-thought-trigger-icon size-5"
        />
      </span>

      <span
        data-slot="chain-of-thought-trigger-label"
        className="aui-chain-of-thought-trigger-label-wrapper relative inline-block leading-6"
      >
        <span>{displayLabel}</span>
        {active && (
          <span
            aria-hidden
            data-slot="chain-of-thought-trigger-shimmer"
            className={cn(
              "aui-chain-of-thought-trigger-shimmer shimmer pointer-events-none absolute inset-0",
              // Diagonal shimmer (30°) feels more dynamic than horizontal
              "shimmer-angle-30",
              "motion-reduce:animate-none",
            )}
          >
            {displayLabel}
          </span>
        )}
      </span>

      <span className="flex h-6 shrink-0 items-center">
        <ChevronDownIcon
          data-slot="chain-of-thought-trigger-chevron"
          className={cn(
            "aui-chain-of-thought-trigger-chevron size-4",
            // Smooth ease-out for refined rotation
            "transition-transform duration-(--animation-duration) ease-(--spring-easing)",
            "group-data-[state=closed]/trigger:-rotate-90",
            "group-data-[state=open]/trigger:rotate-0",
          )}
        />
      </span>
    </CollapsibleTrigger>
  );
}

/**
 * Fade overlay that appears at the bottom of collapsed content.
 */
function ChainOfThoughtFade({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chain-of-thought-fade"
      className={cn(
        "aui-chain-of-thought-fade",
        "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8",
        "bg-[linear-gradient(to_top,var(--color-background),transparent)]",
        "group-data-[variant=muted]/chain-of-thought-root:bg-[linear-gradient(to_top,hsl(var(--muted)),transparent)]",
        "dark:group-data-[variant=muted]/chain-of-thought-root:bg-[linear-gradient(to_top,hsl(var(--card)),transparent)]",
        // Fade animation
        "fade-in-0 animate-in duration-(--animation-duration)",
        "group-data-[state=open]/collapsible-content:animate-out",
        "group-data-[state=open]/collapsible-content:fade-out-0",
        "group-data-[state=open]/collapsible-content:delay-[calc(var(--animation-duration)*0.75)]",
        "group-data-[state=open]/collapsible-content:fill-mode-forwards",
        "group-data-[state=open]/collapsible-content:duration-(--animation-duration)",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Collapsible content wrapper with animation and connector line.
 * Uses spring easing for open, expo for close with opacity leading.
 */
function ChainOfThoughtContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      data-slot="chain-of-thought-content"
      className={cn(
        "aui-chain-of-thought-content",
        "relative overflow-hidden text-muted-foreground text-sm outline-none",
        "group/collapsible-content",
        // Open: spring easing for natural expansion
        "data-[state=open]:animate-collapsible-down",
        "data-[state=open]:duration-(--animation-duration)",
        "data-[state=open]:ease-(--spring-easing)",
        // Close: expo easing, slightly faster for snappy feel
        "data-[state=closed]:animate-collapsible-up",
        "data-[state=closed]:duration-[calc(var(--animation-duration)*0.75)]",
        "data-[state=closed]:ease-(--ease-out-expo)",
        "data-[state=closed]:fill-mode-forwards",
        "data-[state=closed]:pointer-events-none",
        className,
      )}
      {...props}
    >
      {children}
      <ChainOfThoughtFade />
    </CollapsibleContent>
  );
}

/**
 * Hook to manage auto-scroll behavior for streaming content.
 * Auto-scrolls to bottom when new content arrives, unless user has scrolled up.
 */
function useAutoScroll(
  scrollEl: HTMLElement | null,
  contentKey: unknown,
  enabled: boolean,
  behavior: ScrollBehavior = "auto",
) {
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const isUserScrollingRef = useRef(false);

  // Track if user has scrolled up from the bottom
  const handleScroll = useCallback(() => {
    if (!enabled || !scrollEl) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollEl;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;

    if (!isUserScrollingRef.current) {
      // Programmatic scroll, ignore
      return;
    }

    setIsScrolledUp(!isAtBottom);
  }, [enabled, scrollEl]);

  // Reset state when disabled (avoid stale "scrolled up" state).
  useEffect(() => {
    if (!enabled) setIsScrolledUp(false);
  }, [enabled]);

  // Auto-scroll to bottom when content changes, unless the user scrolled up.
  useLayoutEffect(() => {
    // Ensure the effect re-runs when the caller's content changes.
    void contentKey;

    if (!enabled || !scrollEl || isScrolledUp) return;

    isUserScrollingRef.current = false;
    if (typeof scrollEl.scrollTo === "function") {
      scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior });
    } else {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    }
    // Reset user scrolling flag after a tick
    requestAnimationFrame(() => {
      isUserScrollingRef.current = true;
    });
  }, [contentKey, enabled, isScrolledUp, scrollEl, behavior]);

  // Set up scroll listener
  useEffect(() => {
    if (!enabled || !scrollEl) return;

    isUserScrollingRef.current = true;
    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [enabled, scrollEl, handleScroll]);

  const scrollToBottom = useCallback(() => {
    if (!scrollEl) return;

    isUserScrollingRef.current = false;
    if (typeof scrollEl.scrollTo === "function") {
      scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: "smooth" });
    } else {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    }
    setIsScrolledUp(false);
    requestAnimationFrame(() => {
      isUserScrollingRef.current = true;
    });
  }, [scrollEl]);

  return { isScrolledUp, scrollToBottom };
}

/**
 * "Latest" button for scrollable containers - affixed to bottom of container.
 */
function JumpToLatestButton({
  onClick,
  visible,
}: {
  onClick: () => void;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      data-slot="chain-of-thought-jump-to-latest"
      className={cn(
        "aui-chain-of-thought-jump-to-latest absolute right-2 bottom-2 z-20",
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
        "bg-primary text-primary-foreground text-xs shadow-md",
        "transition-all duration-200 ease-(--spring-easing)",
        "hover:bg-primary/90 hover:shadow-lg",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        "[&_svg]:size-3",
        // Entry animation
        "fade-in-0 slide-in-from-bottom-2 animate-in",
      )}
    >
      <ArrowDownIcon aria-hidden />
      Latest
    </button>
  );
}

export type ChainOfThoughtTextProps = React.ComponentProps<"div"> & {
  /** Enable auto-scroll when content changes (for streaming) */
  autoScroll?: boolean;
  /** Show streaming cursor at the end of content */
  showCursor?: boolean;
};

/**
 * Text content container with scroll, animation, and optional auto-scroll.
 */
function ChainOfThoughtText({
  className,
  autoScroll = false,
  showCursor = false,
  children,
  ...props
}: ChainOfThoughtTextProps) {
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const { isScrolledUp, scrollToBottom } = useAutoScroll(
    scrollEl,
    children,
    autoScroll,
  );

  return (
    <div className="aui-chain-of-thought-text-wrapper relative">
      <div
        ref={(el) => setScrollEl(el)}
        data-slot="chain-of-thought-text"
        className={cn(
          "aui-chain-of-thought-text",
          "relative z-0 max-h-64 overflow-y-auto overflow-x-hidden pt-2 pb-2 pl-9 leading-relaxed",
          // Handle long unbreakable content (URLs, code, etc.)
          "break-words [overflow-wrap:anywhere]",
          "transform-gpu",
          // Open animation: spring easing, staggered fade+slide
          "group-data-[state=open]/collapsible-content:animate-in",
          "group-data-[state=open]/collapsible-content:fade-in-0",
          "group-data-[state=open]/collapsible-content:slide-in-from-top-3",
          "group-data-[state=open]/collapsible-content:duration-(--animation-duration)",
          "group-data-[state=open]/collapsible-content:ease-(--spring-easing)",
          // Close animation: opacity leads, then slide
          "group-data-[state=closed]/collapsible-content:animate-out",
          "group-data-[state=closed]/collapsible-content:fade-out-0",
          "group-data-[state=closed]/collapsible-content:slide-out-to-top-2",
          "group-data-[state=closed]/collapsible-content:duration-[calc(var(--animation-duration)*0.8)]",
          "group-data-[state=closed]/collapsible-content:ease-(--ease-out-expo)",
          className,
        )}
        {...props}
      >
        {children}
        {showCursor && (
          <span
            aria-hidden
            className="aui-chain-of-thought-cursor ml-1 inline-block size-2 animate-pulse rounded-full bg-foreground/70 align-middle"
          />
        )}
      </div>
      {autoScroll && (
        <JumpToLatestButton onClick={scrollToBottom} visible={isScrolledUp} />
      )}
    </div>
  );
}

/**
 * Placeholder for unavailable, empty, or redacted reasoning content.
 */
function ChainOfThoughtPlaceholder({
  className,
  children = "Reasoning hidden.",
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chain-of-thought-placeholder"
      className={cn(
        "aui-chain-of-thought-placeholder",
        "py-2 pl-9 text-muted-foreground/70 italic",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type ChainOfThoughtTimelineProps = React.ComponentProps<"ul"> & {
  /** Enable auto-scroll when content changes (for streaming) */
  autoScroll?: boolean;
  /** Override the key that triggers auto-scroll (useful for calming scroll) */
  autoScrollKey?: unknown;
  /** Control scroll behavior when auto-scrolling */
  autoScrollBehavior?: ScrollBehavior;
  /** Limit the visible steps to the last N */
  windowSize?: number;
  /** Animate window transitions (slide out top / slide in bottom) */
  windowTransition?: boolean;
  /** Enable timeline scrolling (disable for nested timelines) */
  scrollable?: boolean;
  /** Row density for CSS windowing calculations */
  windowDensity?: "regular" | "compact";
};

/**
 * Timeline container with vertical connecting line.
 * Use with ChainOfThoughtStep children for step-by-step visualization.
 * Injects --step-index CSS custom property for staggered animations.
 */
function ChainOfThoughtTimeline({
  className,
  autoScroll = true,
  autoScrollKey,
  autoScrollBehavior = "auto",
  windowSize,
  windowTransition = true,
  scrollable = true,
  windowDensity = "regular",
  children,
  ...props
}: ChainOfThoughtTimelineProps) {
  // Inject step animation keyframes once
  useLayoutEffect(() => {
    injectStepKeyframes();
  }, []);

  const [scrollEl, setScrollEl] = useState<HTMLUListElement | null>(null);
  const { isScrolledUp, scrollToBottom } = useAutoScroll(
    scrollEl,
    autoScrollKey ?? children,
    autoScroll,
    autoScrollBehavior,
  );

  const setScrollRef = useCallback((el: HTMLUListElement | null) => {
    setScrollEl((current) => (current === el ? current : el));
  }, []);

  const { style: listStyle, ...listProps } = props;
  const isExpanded = false;
  const isExpandAnimating = false;
  const childrenArray = Children.toArray(children).filter(isValidElement) as
    | React.ReactElement[]
    | [];
  const totalCount = childrenArray.length;
  const stepCount = childrenArray.length;
  const hasWindow = typeof windowSize === "number" && windowSize > 0;
  const isWindowed = hasWindow;
  const isWindowActive =
    hasWindow && windowSize ? totalCount > windowSize && !isExpanded : false;
  const windowCount =
    hasWindow && windowSize ? Math.min(windowSize, totalCount) : totalCount;
  const shiftCount =
    isWindowActive && windowSize ? Math.max(0, totalCount - windowSize) : 0;
  const baseWindowRow = windowDensity === "compact" ? 44 : 56;
  // Matches list padding (pt-1 pb-2) so the window height stays accurate.
  const windowPadding = 12;
  const [measuredRow, setMeasuredRow] = useState<number | null>(null);
  const windowRow = measuredRow ?? baseWindowRow;

  useLayoutEffect(() => {
    if (!hasWindow || !scrollEl || isWindowActive || stepCount === 0) return;
    const step = scrollEl.querySelector(
      '[data-slot="chain-of-thought-step"]',
    ) as HTMLElement | null;
    if (!step) return;
    const height = step.getBoundingClientRect().height;
    if (!height) return;
    const nextRow = Math.round(height);
    setMeasuredRow((current) =>
      current != null && Math.abs(current - nextRow) < 1 ? current : nextRow,
    );
  }, [hasWindow, isWindowActive, scrollEl, stepCount]);

  useEffect(() => {
    if (!hasWindow) {
      setMeasuredRow(null);
    } else {
      setMeasuredRow((current) => current ?? baseWindowRow);
    }
  }, [baseWindowRow, hasWindow]);
  const buildStaggeredChildren = (items: React.ReactElement[]) => {
    let stepIndex = 0;
    return items.map((child) => {
      const cloned = cloneElement(child, {
        style: {
          ...((child.props as { style?: React.CSSProperties }).style || {}),
          "--step-index": stepIndex,
        } as React.CSSProperties,
        className: cn((child.props as { className?: string }).className),
      } as React.HTMLAttributes<HTMLElement>);

      stepIndex += 1;
      return cloned;
    });
  };

  const staggeredChildren = buildStaggeredChildren(childrenArray);

  const allowScroll = scrollable && !isWindowActive && !isExpanded;
  const listClassName = cn(
    "aui-chain-of-thought-timeline",
    "relative z-0",
    "flex flex-col pt-1 pb-2",
    "transform-gpu",
    // Open animation: spring easing, staggered fade+slide
    "group-data-[state=open]/collapsible-content:animate-in",
    "group-data-[state=open]/collapsible-content:fade-in-0",
    "group-data-[state=open]/collapsible-content:slide-in-from-top-3",
    "group-data-[state=open]/collapsible-content:duration-(--animation-duration)",
    "group-data-[state=open]/collapsible-content:ease-(--spring-easing)",
    // Close animation: opacity leads, then slide
    "group-data-[state=closed]/collapsible-content:animate-out",
    "group-data-[state=closed]/collapsible-content:fade-out-0",
    "group-data-[state=closed]/collapsible-content:slide-out-to-top-2",
    "group-data-[state=closed]/collapsible-content:duration-[calc(var(--animation-duration)*0.8)]",
    "group-data-[state=closed]/collapsible-content:ease-(--ease-out-expo)",
    allowScroll
      ? "max-h-64 overflow-y-auto overflow-x-hidden"
      : "overflow-visible",
    className,
  );

  const windowStyles = hasWindow
    ? ({
        "--aui-window-row": `${windowRow}px`,
        "--aui-window-count": `${windowCount}`,
        "--aui-window-shift": `${shiftCount}`,
        "--aui-window-total": `${totalCount}`,
        "--aui-window-padding": `${windowPadding}px`,
      } as React.CSSProperties)
    : undefined;

  return (
    <div className="aui-chain-of-thought-timeline-wrapper relative">
      <div
        className="aui-chain-of-thought-timeline-window relative"
        data-windowed={isWindowed ? "true" : "false"}
        data-window-active={isWindowActive ? "true" : "false"}
        data-window-transition={windowTransition ? "true" : "false"}
        data-expanded={isExpanded ? "true" : "false"}
        data-expand-animating={isExpandAnimating ? "true" : "false"}
        style={windowStyles}
      >
        <ul
          ref={setScrollRef}
          data-slot="chain-of-thought-timeline"
          data-step-count={stepCount}
          data-windowed={isWindowed ? "true" : "false"}
          data-window-active={isWindowActive ? "true" : "false"}
          data-window-transition={windowTransition ? "true" : "false"}
          data-window-shift={shiftCount > 0 ? "true" : "false"}
          data-expanded={isExpanded ? "true" : "false"}
          className={listClassName}
          style={listStyle}
          {...listProps}
        >
          {staggeredChildren}
        </ul>
      </div>
      {autoScroll && (
        <JumpToLatestButton onClick={scrollToBottom} visible={isScrolledUp} />
      )}
    </div>
  );
}

export type ChainOfThoughtStepProps = React.ComponentProps<"li"> &
  VariantProps<typeof stepVariants> & {
    /** Whether this step is currently active/streaming */
    active?: boolean;
    /** Step number or label (shown inside bullet) */
    stepLabel?: string | number;
    /** Step type - determines the default icon */
    type?: StepType;
    /** Custom icon (overrides type-based icon) */
    icon?: LucideIcon | ReactNode;
    /** Error message to display (sets status to error) */
    error?: string;
    /** Callback when retry is clicked (shows retry button when provided) */
    onRetry?: () => void;
    /** Visual density for nested steps */
    density?: "regular" | "compact";
  };

/**
 * Render a step indicator icon with consistent wrapper styling.
 * Includes pulsing animation on contents for active status.
 */
function StepIndicatorWrapper({
  status,
  hasBorder = false,
  compact = false,
  children,
}: {
  status: StepStatus | undefined;
  hasBorder?: boolean;
  compact?: boolean;
  children: ReactNode;
}) {
  const isActive = status === "active";
  const isComplete = status === "complete";
  const isPending = status === "pending";
  const isError = status === "error";

  return (
    <span
      data-slot="chain-of-thought-step-indicator"
      data-status={status}
      className={cn(
        "aui-chain-of-thought-step-indicator transform-gpu",
        "relative flex size-6 shrink-0 items-center justify-center rounded-full",
        compact && "scale-[0.6]",
        // Background should match the parent variant so the timeline line does not show through
        "bg-background",
        "group-data-[variant=muted]/chain-of-thought-root:bg-muted",
        "group-data-[variant=muted]/chain-of-thought-root:dark:bg-card",
        // Smooth transitions for status changes
        "transition-[border-color,background-color,box-shadow] duration-200 ease-(--spring-easing)",
        hasBorder && "border",
        hasBorder &&
          isActive &&
          "border-primary bg-primary/10 shadow-[0_0_0_4px_hsl(var(--primary)/0.1)]",
        hasBorder && isComplete && "border-muted-foreground/40",
        hasBorder && isPending && "border-muted-foreground/20",
        hasBorder &&
          isError &&
          "border-destructive bg-destructive/10 shadow-[0_0_0_4px_hsl(var(--destructive)/0.1)]",
        // Default (borderless) indicator uses text color by status
        !hasBorder &&
          "data-[status=active]:text-primary data-[status=complete]:text-muted-foreground data-[status=error]:text-destructive data-[status=pending]:text-muted-foreground/50",
      )}
    >
      {/* Wrap children with pulse animation when active */}
      <span
        className={cn(
          "flex items-center justify-center",
          isActive &&
            "animate-pulse [animation-duration:1.5s] motion-reduce:animate-none",
        )}
      >
        {children}
      </span>
    </span>
  );
}

/**
 * Individual step in a chain-of-thought timeline.
 * Displays an icon connected to the vertical timeline line.
 */
function ChainOfThoughtStep({
  className,
  status,
  active,
  stepLabel,
  type = "default",
  icon,
  error,
  onRetry,
  density = "regular",
  children,
  ...props
}: ChainOfThoughtStepProps) {
  // Error prop overrides status
  const effectiveStatus: StepStatus = error
    ? "error"
    : active
      ? "active"
      : (status ?? "complete");

  const isActive = effectiveStatus === "active";
  const isError = effectiveStatus === "error";
  const isCompact = density === "compact";

  const renderIndicator = () => {
    // Error state shows error icon
    if (effectiveStatus === "error") {
      return (
        <StepIndicatorWrapper
          status={effectiveStatus}
          hasBorder={!!stepLabel}
          compact={isCompact}
        >
          {stepLabel !== undefined ? (
            <span className="aui-chain-of-thought-step-indicator-error-label font-medium text-[10px] text-destructive">
              !
            </span>
          ) : (
            <IconRenderer Icon={AlertCircleIcon} />
          )}
        </StepIndicatorWrapper>
      );
    }

    // Numbered/labeled indicator
    if (stepLabel !== undefined) {
      return (
        <StepIndicatorWrapper
          status={effectiveStatus}
          hasBorder
          compact={isCompact}
        >
          <span
            className={cn(
              "aui-chain-of-thought-step-indicator-label font-medium text-[10px]",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            {stepLabel}
          </span>
        </StepIndicatorWrapper>
      );
    }

    // Custom icon
    if (icon) {
      const isComponent = typeof icon === "function";
      return (
        <StepIndicatorWrapper status={effectiveStatus} compact={isCompact}>
          {isComponent ? (
            <IconRenderer Icon={icon as LucideIcon} pulse={active === true} />
          ) : (
            icon
          )}
        </StepIndicatorWrapper>
      );
    }

    // Type-based icon (default type uses small bullet dot)
    const TypeIcon = stepTypeIcons[type];
    if (TypeIcon === null) {
      return (
        <StepIndicatorWrapper status={effectiveStatus} compact={isCompact}>
          <BulletDot />
        </StepIndicatorWrapper>
      );
    }
    return (
      <StepIndicatorWrapper status={effectiveStatus}>
        <IconRenderer Icon={TypeIcon} pulse={active === true} />
      </StepIndicatorWrapper>
    );
  };

  return (
    <li
      data-slot="chain-of-thought-step"
      data-status={effectiveStatus}
      data-type={type}
      data-density={density}
      className={cn(
        stepVariants({ status: effectiveStatus, className }),
        isCompact && "gap-2 py-1",
        // Hide connectors at first/last positions using CSS selectors
        // Uses first-of-type/last-of-type for compatibility with dynamically rendered children
        "first-of-type:[&>[data-slot=chain-of-thought-step-connector-above]]:hidden",
        "last-of-type:[&>[data-slot=chain-of-thought-step-connector-below]]:hidden",
      )}
      {...props}
    >
      {/* Connector from previous step */}
      <div
        aria-hidden="true"
        data-slot="chain-of-thought-step-connector-above"
        className="pointer-events-none absolute top-0 left-3 h-1.5 w-px bg-foreground/15 motion-reduce:animate-none"
        style={{
          animation: `aui-connector-fade ${ANIMATION_DURATION}ms ${SPRING_EASING} var(--step-delay) both`,
        }}
      />
      {/* Connector to next step */}
      <div
        aria-hidden="true"
        data-slot="chain-of-thought-step-connector-below"
        className="pointer-events-none absolute top-[30px] bottom-0 left-3 w-px bg-foreground/15 motion-reduce:animate-none"
        style={{
          animation: `aui-connector-fade ${ANIMATION_DURATION}ms ${SPRING_EASING} var(--step-delay) both`,
        }}
      />

      <div
        className="aui-chain-of-thought-step-indicator-wrapper relative z-10 overflow-visible motion-reduce:animate-none"
        style={{
          animation: `aui-icon-enter ${ANIMATION_DURATION}ms ${SPRING_EASING} var(--step-delay) both`,
          willChange: "transform, opacity, filter",
        }}
      >
        {renderIndicator()}
      </div>

      <div
        data-slot="chain-of-thought-step-content"
        className={cn(
          "aui-chain-of-thought-step-content",
          "min-w-0 flex-1 text-muted-foreground leading-relaxed",
          "break-words [overflow-wrap:anywhere]",
          "transition-colors duration-200",
          isActive && "text-foreground",
          isError && "text-destructive",
          "motion-reduce:animate-none",
        )}
        style={{
          animation: `aui-content-enter ${ANIMATION_DURATION}ms ${SPRING_EASING} var(--step-delay) both`,
        }}
      >
        {children}
        {/* Error message and retry button */}
        {error && (
          <div className="aui-chain-of-thought-step-error-row mt-1.5 flex items-center gap-2">
            <span className="aui-chain-of-thought-step-error-text text-destructive text-xs">
              {error}
            </span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className={cn(
                  "aui-chain-of-thought-step-retry inline-flex items-center gap-1 rounded-md px-2 py-0.5",
                  "bg-destructive/10 text-destructive text-xs",
                  "transition-colors hover:bg-destructive/20",
                  "focus:outline-none focus:ring-2 focus:ring-destructive/50",
                  "[&_svg]:size-3",
                )}
              >
                <RotateCcwIcon aria-hidden />
                Retry
              </button>
            )}
          </div>
        )}
        {active && (
          <span
            aria-hidden
            data-slot="chain-of-thought-step-shimmer"
            className={cn(
              "aui-chain-of-thought-step-shimmer shimmer shimmer-invert pointer-events-none absolute inset-0",
              // Diagonal shimmer for more dynamic feel
              "shimmer-angle-30",
              "motion-reduce:animate-none",
            )}
          />
        )}
      </div>
    </li>
  );
}

/**
 * Renders a Lucide icon with status-based styling.
 * Active icons no longer pulse independently - the wrapper handles the ring animation.
 */
function IconRenderer({
  Icon,
}: {
  Icon: LucideIcon;
  pulse?: boolean; // Kept for API compatibility but no longer used
}) {
  return (
    <Icon
      className={cn(
        "aui-chain-of-thought-step-icon relative z-10 size-5",
        "transition-[color,transform] duration-200 ease-(--spring-easing)",
      )}
    />
  );
}

/**
 * Accessibility live region for announcing step status changes.
 * Renders visually hidden but announced by screen readers.
 */
function ChainOfThoughtAnnouncer({ message }: { message: string | null }) {
  const [announcement, setAnnouncement] = useState<string | null>(null);

  useEffect(() => {
    if (message) {
      setAnnouncement(message);
      // Clear after announcement to allow re-announcing same message
      const timer = setTimeout(() => setAnnouncement(null), 1000);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [message]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-slot="chain-of-thought-announcer"
      className="aui-chain-of-thought-announcer sr-only"
    >
      {announcement}
    </div>
  );
}

/**
 * Header/title for a step.
 */
function ChainOfThoughtStepHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chain-of-thought-step-header"
      className={cn(
        "aui-chain-of-thought-step-header font-medium text-foreground",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Body content for a step.
 */
function ChainOfThoughtStepBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chain-of-thought-step-body"
      className={cn(
        "aui-chain-of-thought-step-body",
        // Consistent line-height for nested lists and content
        "[&_li]:leading-relaxed [&_ol]:my-1 [&_ul]:my-1",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Container for step badges/tags.
 */
function ChainOfThoughtStepBadges({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chain-of-thought-step-badges"
      className={cn(
        "aui-chain-of-thought-step-badges mt-1.5 flex flex-wrap gap-1.5 pb-0.5",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Individual badge for sources or metadata.
 */
function ChainOfThoughtBadge({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="chain-of-thought-badge"
      className={cn(
        "aui-chain-of-thought-badge",
        "inline-flex items-center rounded-full bg-muted px-2.5 py-0.5",
        "text-muted-foreground text-xs",
        className,
      )}
      {...props}
    />
  );
}

export type ChainOfThoughtToolBadgeProps = React.ComponentProps<"span"> & {
  /** Tool name to display */
  toolName: string;
  /** Tool status */
  status?: "running" | "complete" | "error";
  /** Apply text shimmer to the tool name */
  shimmer?: boolean;
};

/**
 * Inline tool badge for displaying tool calls within ChainOfThought traces.
 * A flattened, non-collapsible alternative to ToolFallback for less visual clutter.
 */
function ChainOfThoughtToolBadge({
  toolName,
  status = "complete",
  shimmer = false,
  className,
  ...props
}: ChainOfThoughtToolBadgeProps) {
  const isRunning = status === "running";
  const isError = status === "error";

  return (
    <span
      data-slot="chain-of-thought-tool-badge"
      data-status={status}
      className={cn(
        "aui-chain-of-thought-tool-badge",
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5",
        "font-mono text-xs",
        // Status-based styling
        isError
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground",
        className,
      )}
      {...props}
    >
      {isRunning && (
        <span
          aria-hidden
          className="aui-chain-of-thought-tool-badge-spinner size-3 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {isError && (
        <AlertCircleIcon
          aria-hidden
          className="aui-chain-of-thought-tool-badge-error-icon size-3"
        />
      )}
      {!isRunning && !isError && (
        <WrenchIcon
          aria-hidden
          className="aui-chain-of-thought-tool-badge-icon size-3"
        />
      )}
      <span
        className={cn(
          "aui-chain-of-thought-tool-badge-name truncate",
          shimmer &&
            "shimmer shimmer-invert shimmer-angle-30 text-muted-foreground/70",
        )}
      >
        {toolName}
      </span>
    </span>
  );
}

/**
 * Image container for steps with visual content.
 */
function ChainOfThoughtStepImage({
  className,
  src,
  alt = "",
  ...props
}: React.ComponentProps<"div"> & { src?: string; alt?: string }) {
  if (!src) return null;

  return (
    <div
      data-slot="chain-of-thought-step-image"
      className={cn(
        "aui-chain-of-thought-step-image mt-2 overflow-hidden rounded-lg",
        className,
      )}
      {...props}
    >
      <img
        src={src}
        alt={alt}
        className="aui-chain-of-thought-step-image-img max-h-48 w-auto rounded-lg border object-cover"
      />
    </div>
  );
}

type PartsGroupedGroupingFunction = React.ComponentProps<
  typeof MessagePrimitive.Unstable_PartsGrouped
>["groupingFunction"];

type MessagePartGroup = ReturnType<PartsGroupedGroupingFunction>[number];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getParentId = (part: unknown): string | undefined => {
  if (!isRecord(part)) return undefined;
  const parentId = part["parentId"];
  return typeof parentId === "string" ? parentId : undefined;
};

const groupMessagePartsByParentId: PartsGroupedGroupingFunction = (
  parts: readonly any[],
) => {
  // Map maintains insertion order, so groups appear in order of first occurrence
  const groupMap = new Map<string, number[]>();

  // Process each part in order
  for (let i = 0; i < parts.length; i++) {
    const parentId = getParentId(parts[i]);

    // For parts without parentId, assign a unique group ID to maintain their position
    const groupId = parentId ?? `__ungrouped_${i}`;

    const indices = groupMap.get(groupId) ?? [];
    indices.push(i);
    groupMap.set(groupId, indices);
  }

  const groups: MessagePartGroup[] = [];
  for (const [groupId, indices] of groupMap) {
    const groupKey = groupId.startsWith("__ungrouped_") ? undefined : groupId;
    groups.push({ groupKey, indices });
  }

  return groups;
};

const isTraceGroup = (node: TraceNode): node is TraceGroup =>
  node.kind === "group";

const isTraceStep = (node: TraceNode): node is TraceStep =>
  node.kind === "step";

const mapTraceStatusToStepStatus = (status?: TraceStatus): StepStatus => {
  switch (status) {
    case "running":
      return "active";
    case "incomplete":
    case "error":
      return "error";
    default:
      return "complete";
  }
};

const mapStepStatusToTraceStatus = (
  status?: StepStatus,
): TraceStatus | undefined => {
  switch (status) {
    case "active":
      return "running";
    case "complete":
      return "complete";
    case "error":
      return "error";
    case "pending":
      return "incomplete";
    default:
      return undefined;
  }
};

const mapTraceStatusToToolBadge = (
  status?: TraceStatus,
): "running" | "complete" | "error" => {
  switch (status) {
    case "running":
      return "running";
    case "incomplete":
    case "error":
      return "error";
    default:
      return "complete";
  }
};

const getLatestTraceStep = (node: TraceNode): TraceStep | undefined => {
  if (isTraceStep(node)) return node;
  for (let i = node.children.length - 1; i >= 0; i--) {
    const child = node.children[i]!;
    const latest = getLatestTraceStep(child);
    if (latest) return latest;
  }
  return undefined;
};

const getTraceStepLabel = (step: TraceStep): ReactNode | undefined => {
  if (step.label !== undefined) return step.label;
  if (step.toolName) return `Tool: ${step.toolName}`;
  return undefined;
};

export type ChainOfThoughtTraceStepMeta = {
  label?: ReactNode;
  type?: StepType;
  status?: StepStatus;
  stepLabel?: string | number;
  icon?: LucideIcon | ReactNode;
};

export type ChainOfThoughtTraceGroupSummaryProps = {
  group: TraceGroup;
  latestStep?: TraceStep;
  isOpen: boolean;
  canExpand: boolean;
  onToggle: () => void;
  depth?: number;
};

export type ChainOfThoughtTraceNodeComponents = {
  GroupSummary?: ComponentType<ChainOfThoughtTraceGroupSummaryProps>;
  StepBody?: ComponentType<{ step: TraceStep }>;
};

type ChainOfThoughtTraceNodesProps = Omit<
  React.ComponentProps<typeof ChainOfThoughtTimeline>,
  "children"
> & {
  trace: TraceNode[];
  maxDepth?: number;
  nodeComponents?: ChainOfThoughtTraceNodeComponents;
  windowSize?: number;
  scrollable?: boolean;
  allowGroupExpand?: boolean;
};

type ChainOfThoughtTracePartsProps = Omit<
  React.ComponentProps<typeof ChainOfThoughtTimeline>,
  "children"
> & {
  trace?: undefined;
  groupingFunction?: PartsGroupedGroupingFunction;
  components?: React.ComponentProps<
    typeof MessagePrimitive.Unstable_PartsGrouped
  >["components"];
  /**
   * Customize how a grouped step is labeled and styled.
   *
   * - `parts` are the message parts within the group (in order)
   * - `isActive` is true when the message is running and this group contains the newest part
   */
  inferStep?: (args: {
    groupKey: string | undefined;
    indices: number[];
    parts: readonly any[];
    isActive: boolean;
  }) => ChainOfThoughtTraceStepMeta;
};

export type ChainOfThoughtTraceProps =
  | ChainOfThoughtTraceNodesProps
  | ChainOfThoughtTracePartsProps;

type ChainOfThoughtTraceDisclosureSharedProps = {
  /** Label to show while streaming */
  label?: string;
  /** Completed summary string or formatter */
  summary?: string | TraceSummaryFormatter;
  /** Auto-collapse after streaming completes */
  collapseOnComplete?: boolean;
  /** Prevent nested groups from expanding while streaming */
  disableGroupExpansionWhileStreaming?: boolean;
  /** Props for the root collapsible container */
  rootProps?: Omit<ChainOfThoughtRootProps, "open" | "onOpenChange">;
  /** Props for the trigger button */
  triggerProps?: Omit<ChainOfThoughtTriggerProps, "label" | "active">;
  /** Props for the collapsible content wrapper */
  contentProps?: Omit<
    React.ComponentProps<typeof ChainOfThoughtContent>,
    "children"
  >;
};

export type ChainOfThoughtTraceDisclosureProps =
  | (ChainOfThoughtTraceNodesProps & ChainOfThoughtTraceDisclosureSharedProps)
  | (ChainOfThoughtTracePartsProps & ChainOfThoughtTraceDisclosureSharedProps);

type ToolCallPartLike = {
  type: "tool-call";
  toolName?: string;
};

const isToolCallPart = (part: unknown): part is ToolCallPartLike =>
  isRecord(part) && part["type"] === "tool-call";

const defaultInferStep: NonNullable<
  ChainOfThoughtTracePartsProps["inferStep"]
> = ({ groupKey, parts }) => {
  const tool = parts.find(isToolCallPart);
  const toolName = tool?.toolName;

  const type: StepType = toolName
    ? toolName.includes("search")
      ? "search"
      : toolName.includes("image")
        ? "image"
        : "tool"
    : "default";

  if (toolName) return { label: `Tool: ${toolName}`, type };
  if (!groupKey) return { type };
  return { label: "Step", type };
};

export type TraceFromMessagePartsOptions = {
  groupingFunction?: PartsGroupedGroupingFunction;
  inferStep?: ChainOfThoughtTracePartsProps["inferStep"];
};

export const traceFromMessageParts = (
  parts: readonly any[],
  options: TraceFromMessagePartsOptions = {},
): TraceNode[] => {
  const groupingFunction =
    options.groupingFunction ?? groupMessagePartsByParentId;
  const inferStep = options.inferStep ?? defaultInferStep;
  const groups = groupingFunction(parts);

  return groups.map((group, index) => {
    const groupParts = group.indices
      .map((i) => parts[i])
      .filter((part): part is (typeof parts)[number] => Boolean(part));
    const meta = inferStep({
      groupKey: group.groupKey,
      indices: group.indices,
      parts: groupParts,
      isActive: false,
    });
    const tool = groupParts.find(isToolCallPart);
    const toolName = tool?.toolName;

    return {
      kind: "step",
      id: group.groupKey ?? `step-${index}`,
      label: meta.label,
      type: meta.type,
      status: mapStepStatusToTraceStatus(meta.status),
      toolName,
    } satisfies TraceStep;
  });
};

export type TraceFromThreadMessageOptions = TraceFromMessagePartsOptions;

export const traceFromThreadMessage = (
  message: ThreadMessage,
  options: TraceFromThreadMessageOptions = {},
): TraceNode[] => {
  return traceFromMessageParts(message.content, options);
};

type ChainOfThoughtTraceContextValue = {
  inferStep: NonNullable<ChainOfThoughtTracePartsProps["inferStep"]>;
};

const ChainOfThoughtTraceContext =
  createContext<ChainOfThoughtTraceContextValue | null>(null);

type ChainOfThoughtTraceStepIndexContextValue = {
  getStepIndex: (indices: number[]) => number | undefined;
};

const ChainOfThoughtTraceStepIndexContext =
  createContext<ChainOfThoughtTraceStepIndexContextValue | null>(null);

function ChainOfThoughtTracePartsGroup({
  groupKey,
  indices,
  children,
}: {
  groupKey: string | undefined;
  indices: number[];
  children?: ReactNode;
}) {
  const context = useContext(ChainOfThoughtTraceContext);
  const inferStep = context?.inferStep ?? defaultInferStep;
  const stepIndexContext = useContext(ChainOfThoughtTraceStepIndexContext);
  const stepIndex = useMemo(
    () => stepIndexContext?.getStepIndex(indices),
    [indices, stepIndexContext],
  );

  const messageParts = useAuiState(({ message }) => message.parts);
  const isRunning = useAuiState(
    ({ message }) => message.status?.type === "running",
  );

  const groupParts = useMemo(() => {
    return indices
      .map((i) => messageParts[i])
      .filter((part): part is (typeof messageParts)[number] => Boolean(part));
  }, [indices, messageParts]);

  const lastIndex = messageParts.length - 1;
  const isActive = isRunning && lastIndex >= 0 && indices.includes(lastIndex);

  const meta = useMemo(
    () =>
      inferStep({
        groupKey,
        indices,
        parts: groupParts,
        isActive,
      }),
    [inferStep, groupKey, indices, groupParts, isActive],
  );

  return (
    <ChainOfThoughtStep
      active={isActive}
      style={
        stepIndex !== undefined
          ? ({ "--step-index": stepIndex } as React.CSSProperties)
          : undefined
      }
      {...(meta.type ? { type: meta.type } : {})}
      {...(meta.status ? { status: meta.status } : {})}
      {...(meta.stepLabel !== undefined ? { stepLabel: meta.stepLabel } : {})}
      {...(meta.icon !== undefined ? { icon: meta.icon } : {})}
    >
      {meta.label !== undefined ? (
        <ChainOfThoughtStepHeader>{meta.label}</ChainOfThoughtStepHeader>
      ) : null}
      <ChainOfThoughtStepBody>{children}</ChainOfThoughtStepBody>
    </ChainOfThoughtStep>
  );
}

/**
 * Trace/timeline renderer for message parts grouped via `MessagePrimitive.Unstable_PartsGrouped`.
 *
 * This enables a v2 "agent trace" UI without inventing a new message-part schema:
 * - parts that share the same `parentId` render as a single step
 * - ungrouped parts render as individual steps in chronological order
 */
function ChainOfThoughtTraceParts({
  className,
  groupingFunction = groupMessagePartsByParentId,
  components,
  inferStep = defaultInferStep,
  ...timelineProps
}: ChainOfThoughtTracePartsProps) {
  const messageParts = useAuiState(({ message }) => message.parts);
  const groups = useMemo(
    () => (messageParts.length === 0 ? [] : groupingFunction(messageParts)),
    [groupingFunction, messageParts],
  );
  const groupIndexMap = useMemo(() => {
    if (messageParts.length === 0) return new Map<string, number>();
    const groups = groupingFunction(messageParts);
    const map = new Map<string, number>();
    for (const [index, group] of groups.entries()) {
      map.set(group.indices.join("|"), index);
    }
    return map;
  }, [groupingFunction, messageParts]);

  const contextValue = useMemo(() => ({ inferStep }), [inferStep]);
  const stepIndexContextValue = useMemo(
    () => ({
      getStepIndex: (indices: number[]) => groupIndexMap.get(indices.join("|")),
    }),
    [groupIndexMap],
  );
  const groupedComponents = useMemo(
    () => ({
      ...components,
      Group: ChainOfThoughtTracePartsGroup,
    }),
    [components],
  );
  const renderedGroups = useMemo(() => {
    if (messageParts.length === 0) {
      return (
        <MessagePrimitive.Unstable_PartsGrouped
          groupingFunction={groupingFunction}
          components={groupedComponents}
        />
      );
    }

    const GroupComponent =
      groupedComponents?.Group ?? ChainOfThoughtTracePartsGroup;

    return groups.map((group, groupIndex) => (
      <GroupComponent
        key={`group-${groupIndex}-${group.groupKey ?? "ungrouped"}`}
        groupKey={group.groupKey}
        indices={group.indices}
      >
        {group.indices.map((partIndex) => (
          <MessagePrimitive.PartByIndex
            key={partIndex}
            index={partIndex}
            components={groupedComponents}
          />
        ))}
      </GroupComponent>
    ));
  }, [groupedComponents, groupingFunction, groups, messageParts.length]);

  return (
    <ChainOfThoughtTraceContext.Provider value={contextValue}>
      <ChainOfThoughtTraceStepIndexContext.Provider
        value={stepIndexContextValue}
      >
        <ChainOfThoughtTimeline className={className} {...timelineProps}>
          {renderedGroups}
        </ChainOfThoughtTimeline>
      </ChainOfThoughtTraceStepIndexContext.Provider>
    </ChainOfThoughtTraceContext.Provider>
  );
}

const DefaultTraceStepBody: NonNullable<
  ChainOfThoughtTraceNodeComponents["StepBody"]
> = ({ step }) => {
  const output = (() => {
    if (step.output == null) return null;
    if (isRecord(step.output) && "content" in step.output) {
      const content = step.output.content as ReactNode;
      const status =
        step.output.status ??
        (step.status === "running" ? "streaming" : "complete");
      return { content, status };
    }
    return {
      content: step.output as ReactNode,
      status: step.status === "running" ? "streaming" : "complete",
    };
  })();

  if (output == null && step.detail == null) return null;

  return (
    <ChainOfThoughtStepBody className="space-y-1">
      {output ? (
        <ChainOfThoughtTraceOutput
          content={output.content}
          streaming={output.status === "streaming"}
        />
      ) : null}
      {step.detail != null ? <div>{step.detail}</div> : null}
    </ChainOfThoughtStepBody>
  );
};

const TRACE_SUMMARY_TRANSITION_MS = 300;
const TRACE_OUTPUT_STREAM_INTERVAL_MS = 22;

function useTraceDuration(isStreaming: boolean) {
  const [durationSec, setDurationSec] = useState<number | undefined>(undefined);
  const startRef = useRef<number | null>(null);
  const wasStreamingRef = useRef(isStreaming);

  useEffect(() => {
    if (isStreaming) {
      if (!wasStreamingRef.current) {
        startRef.current = Date.now();
        setDurationSec(undefined);
      }
    } else if (wasStreamingRef.current && startRef.current != null) {
      const elapsedMs = Date.now() - startRef.current;
      const elapsedSec = Math.max(1, Math.round(elapsedMs / 1000));
      setDurationSec(elapsedSec);
      startRef.current = null;
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming]);

  return durationSec;
}

function ChainOfThoughtTraceOutput({
  content,
  streaming,
}: {
  content: ReactNode;
  streaming: boolean;
}) {
  if (typeof content !== "string") {
    return <div className="text-muted-foreground/80 text-sm">{content}</div>;
  }

  const [visibleText, setVisibleText] = useState(streaming ? "" : content);
  const [showCursor, setShowCursor] = useState(streaming);
  const [cursorVisible, setCursorVisible] = useState(false);

  useEffect(() => {
    if (!streaming) {
      setVisibleText(content);
      return;
    }

    setVisibleText("");
    let index = 0;
    const interval = window.setInterval(() => {
      index += 1;
      if (index >= content.length) {
        setVisibleText(content);
        window.clearInterval(interval);
        return;
      }
      setVisibleText(content.slice(0, index));
    }, TRACE_OUTPUT_STREAM_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [content, streaming]);

  useEffect(() => {
    if (streaming) {
      setShowCursor(true);
      setCursorVisible(false);
      const raf = requestAnimationFrame(() => {
        setCursorVisible(true);
      });
      return () => cancelAnimationFrame(raf);
    }

    if (showCursor) {
      setCursorVisible(false);
      const timeout = window.setTimeout(() => {
        setShowCursor(false);
      }, 200);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [streaming, showCursor]);

  return (
    <div className="text-muted-foreground/80 text-sm leading-relaxed">
      <span>{visibleText}</span>
      {showCursor && (
        <span
          aria-hidden
          className={cn(
            "aui-chain-of-thought-cursor ml-1 inline-block size-2 rounded-full bg-foreground/70 align-middle",
            "transition-[opacity,filter] duration-200 ease-out",
            cursorVisible ? "opacity-100 blur-0" : "opacity-0 blur-sm",
          )}
        />
      )}
    </div>
  );
}

function ChainOfThoughtTraceSummaryTransition({
  label,
  active,
}: {
  label?: ReactNode;
  active?: boolean;
}) {
  const [currentLabel, setCurrentLabel] = useState(label);
  const [previousLabel, setPreviousLabel] = useState<ReactNode | null>(null);
  const [labelKey, setLabelKey] = useState(0);
  const labelRef = useRef(label);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (Object.is(labelRef.current, label)) return;

    setPreviousLabel(labelRef.current ?? null);
    setCurrentLabel(label);
    setLabelKey((value) => value + 1);
    labelRef.current = label;

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setPreviousLabel(null);
    }, TRACE_SUMMARY_TRANSITION_MS);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [label]);

  if (currentLabel == null && previousLabel == null) return null;
  const shimmerClass = active
    ? "shimmer shimmer-invert shimmer-angle-30 text-muted-foreground/70"
    : undefined;

  return (
    <div className="aui-chain-of-thought-trace-summary relative min-h-[1.25rem] overflow-hidden">
      <div className="relative h-5">
        {previousLabel != null && (
          <span
            key={`prev-${labelKey}`}
            className={cn(
              "aui-chain-of-thought-trace-summary-prev absolute inset-0 flex items-center",
              "truncate text-left",
              "fade-out-0 slide-out-to-top-2 animation-duration-300 animate-out fill-mode-both ease-out",
              shimmerClass,
              "motion-reduce:animate-none",
            )}
          >
            {previousLabel}
          </span>
        )}
        {currentLabel != null && (
          <span
            key={`current-${labelKey}`}
            className={cn(
              "aui-chain-of-thought-trace-summary-current absolute inset-0 flex items-center",
              "truncate text-left",
              "fade-in-0 slide-in-from-bottom-2 animation-duration-300 animate-in fill-mode-both ease-out",
              shimmerClass,
              "motion-reduce:animate-none",
            )}
          >
            {currentLabel}
          </span>
        )}
      </div>
    </div>
  );
}

const DefaultTraceGroupSummary: ComponentType<
  ChainOfThoughtTraceGroupSummaryProps
> = ({ group, latestStep, isOpen, canExpand, onToggle, depth: _depth = 0 }) => {
  const summaryLabel =
    group.summary?.latestLabel ??
    (latestStep ? getTraceStepLabel(latestStep) : undefined) ??
    "Working...";
  const toolName = group.summary?.toolName ?? latestStep?.toolName;
  const isActive = (latestStep?.status ?? group.status) === "running";
  const isSubagent = group.variant === "subagent";
  const badgeStatus = mapTraceStatusToToolBadge(
    latestStep?.status ?? group.status,
  );
  const toolBadge = toolName ? (
    <span className="inline-flex h-5 shrink-0 items-center">
      <ChainOfThoughtToolBadge
        toolName={toolName}
        status={badgeStatus}
        shimmer={isActive}
        className="min-w-0 max-w-[7rem]"
      />
    </span>
  ) : null;

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!canExpand}
      data-slot="chain-of-thought-trace-group-summary"
      data-variant={group.variant ?? "default"}
      className={cn(
        "aui-chain-of-thought-trace-group-summary group/trace-summary w-full text-left",
        "rounded-md px-0 py-0 transition-colors",
        "disabled:cursor-default",
      )}
      aria-expanded={isOpen}
    >
      <div className={cn("flex h-6 items-center gap-2 text-sm")}>
        <span className="font-medium text-foreground">{group.label}</span>
        {isSubagent ? (
          <div className="flex min-w-0 flex-1 items-center gap-2 text-muted-foreground">
            <div className="min-w-0 flex-1">
              <ChainOfThoughtTraceSummaryTransition
                label={summaryLabel}
                active={isActive}
              />
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2 text-muted-foreground">
            {toolBadge}
            <div className="min-w-0 flex-1">
              <ChainOfThoughtTraceSummaryTransition
                label={summaryLabel}
                active={isActive}
              />
            </div>
          </div>
        )}
      </div>
    </button>
  );
};

function ChainOfThoughtTraceStepNode({
  step,
  depth,
  style,
  className,
  nodeComponents,
}: {
  step: TraceStep;
  depth: number;
  style?: React.CSSProperties;
  className?: string;
  nodeComponents?: ChainOfThoughtTraceNodeComponents;
}) {
  const StepBody = nodeComponents?.StepBody ?? DefaultTraceStepBody;
  const label = getTraceStepLabel(step);
  const status = mapTraceStatusToStepStatus(step.status);
  const type = step.type ?? (step.toolName ? "tool" : "default");
  const isActive = step.status === "running";

  return (
    <ChainOfThoughtStep
      data-role="trace-step"
      status={status}
      active={isActive}
      type={type}
      density={depth > 0 ? "compact" : "regular"}
      className={className}
      style={style}
    >
      {label !== undefined ? (
        <ChainOfThoughtStepHeader>{label}</ChainOfThoughtStepHeader>
      ) : null}
      <StepBody step={step} />
    </ChainOfThoughtStep>
  );
}

function ChainOfThoughtTraceGroupNode({
  group,
  depth,
  maxDepth,
  style,
  className,
  nodeComponents,
  windowSize: _windowSize,
  allowGroupExpand = true,
}: {
  group: TraceGroup;
  depth: number;
  maxDepth: number;
  style?: React.CSSProperties;
  className?: string;
  nodeComponents?: ChainOfThoughtTraceNodeComponents;
  windowSize?: number;
  allowGroupExpand?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHoveringSummary, setIsHoveringSummary] = useState(false);
  const latestStep = useMemo(() => getLatestTraceStep(group), [group]);
  const canExpand =
    allowGroupExpand && depth < maxDepth && group.children.length > 0;
  const GroupSummary = nodeComponents?.GroupSummary ?? DefaultTraceGroupSummary;
  const isSubagent = group.variant === "subagent";

  useEffect(() => {
    if (!allowGroupExpand && isOpen) {
      setIsOpen(false);
    }
  }, [allowGroupExpand, isOpen]);

  const groupStatus = group.status ?? latestStep?.status;
  const type =
    group.summary?.latestType ??
    latestStep?.type ??
    (latestStep?.toolName ? "tool" : "default");
  const baseIcon = (() => {
    if (isSubagent) return <IconRenderer Icon={UsersIcon} />;
    const TypeIcon = stepTypeIcons[type];
    if (TypeIcon === null) return <BulletDot />;
    if (!TypeIcon) return <BulletDot />;
    return <IconRenderer Icon={TypeIcon} />;
  })();
  const showChevron = canExpand && (isHoveringSummary || isOpen);
  const chevronSizeClass = depth > 0 ? "size-5" : "size-4";
  const icon = (
    <span className="relative inline-flex size-5 items-center justify-center">
      <span
        className={cn(
          "transition-opacity duration-150 ease-out",
          showChevron ? "opacity-0" : "opacity-100",
        )}
      >
        {baseIcon}
      </span>
      <ChevronDownIcon
        aria-hidden
        className={cn(
          "absolute text-muted-foreground transition-opacity duration-150 ease-out",
          chevronSizeClass,
          showChevron ? "opacity-100" : "opacity-0",
          isOpen ? "rotate-0" : "-rotate-90",
        )}
      />
    </span>
  );
  const indicatorType = isSubagent ? "default" : type;

  return (
    <ChainOfThoughtStep
      data-role="trace-group"
      data-variant={group.variant ?? "default"}
      status={mapTraceStatusToStepStatus(groupStatus)}
      active={groupStatus === "running"}
      type={indicatorType}
      icon={icon}
      density={depth > 0 ? "compact" : "regular"}
      className={cn(className, "group/trace-group")}
      style={style}
    >
      <ChainOfThoughtStepBody>
        <div
          onMouseEnter={() => setIsHoveringSummary(true)}
          onMouseLeave={() => setIsHoveringSummary(false)}
          onFocusCapture={() => setIsHoveringSummary(true)}
          onBlurCapture={() => setIsHoveringSummary(false)}
        >
          <GroupSummary
            group={group}
            latestStep={latestStep}
            isOpen={isOpen}
            canExpand={canExpand}
            depth={depth}
            onToggle={() => {
              if (!canExpand) return;
              setIsOpen((prev) => !prev);
            }}
          />
        </div>
        {isOpen && canExpand && (
          <div
            className={cn(
              "mt-1",
              "fade-in-0 slide-in-from-top-1 animate-in duration-200 ease-out",
            )}
          >
            <ChainOfThoughtTimeline
              autoScroll={false}
              windowSize={0}
              windowTransition={false}
              scrollable={false}
              windowDensity="compact"
              style={
                {
                  "--step-stagger-delay": "24ms",
                } as React.CSSProperties
              }
            >
              {group.children.map((node) =>
                isTraceGroup(node) ? (
                  <ChainOfThoughtTraceGroupNode
                    key={node.id}
                    group={node}
                    depth={depth + 1}
                    maxDepth={maxDepth}
                    nodeComponents={nodeComponents}
                    windowSize={_windowSize}
                    allowGroupExpand={allowGroupExpand}
                  />
                ) : (
                  <ChainOfThoughtTraceStepNode
                    key={node.id}
                    step={node}
                    depth={depth + 1}
                    nodeComponents={nodeComponents}
                  />
                ),
              )}
            </ChainOfThoughtTimeline>
          </div>
        )}
      </ChainOfThoughtStepBody>
    </ChainOfThoughtStep>
  );
}

function ChainOfThoughtTraceNodes({
  className,
  trace,
  maxDepth = 2,
  nodeComponents,
  windowSize = 3,
  scrollable = true,
  allowGroupExpand = true,
  ...timelineProps
}: ChainOfThoughtTraceNodesProps) {
  return (
    <ChainOfThoughtTimeline
      className={className}
      windowSize={windowSize}
      scrollable
      windowTransition
      {...timelineProps}
    >
      {trace.map((node) =>
        isTraceGroup(node) ? (
          <ChainOfThoughtTraceGroupNode
            key={node.id}
            group={node}
            depth={0}
            maxDepth={maxDepth}
            nodeComponents={nodeComponents}
            windowSize={windowSize}
            allowGroupExpand={allowGroupExpand}
          />
        ) : (
          <ChainOfThoughtTraceStepNode
            key={node.id}
            step={node}
            depth={0}
            nodeComponents={nodeComponents}
          />
        ),
      )}
    </ChainOfThoughtTimeline>
  );
}

function useTraceDisclosureState({
  isStreaming,
  collapseOnComplete,
}: {
  isStreaming: boolean;
  collapseOnComplete: boolean;
}) {
  const [open, setOpen] = useState(isStreaming);
  const wasStreamingRef = useRef(isStreaming);

  useEffect(() => {
    if (isStreaming) {
      setOpen(true);
    } else if (wasStreamingRef.current && collapseOnComplete) {
      setOpen(false);
    }
    wasStreamingRef.current = isStreaming;
  }, [collapseOnComplete, isStreaming]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (isStreaming) return;
      setOpen(nextOpen);
    },
    [isStreaming],
  );

  return { open, handleOpenChange };
}

function ChainOfThoughtTraceDisclosureNodes({
  trace,
  label = "Working...",
  summary,
  windowSize = 3,
  windowTransition = true,
  collapseOnComplete = true,
  disableGroupExpansionWhileStreaming = true,
  rootProps,
  triggerProps,
  contentProps,
  ...timelineProps
}: ChainOfThoughtTraceNodesProps & ChainOfThoughtTraceDisclosureSharedProps) {
  const isStreaming = useMemo(() => traceHasRunning(trace), [trace]);
  const durationSec = useTraceDuration(isStreaming);
  const stats = useMemo(() => collectTraceStats(trace), [trace]);
  const summaryLabel = useMemo(() => {
    if (typeof summary === "string") return summary;
    if (typeof summary === "function") {
      return summary({ ...stats, durationSec });
    }
    return summarizeTraceStats(stats, durationSec);
  }, [durationSec, stats, summary]);

  const { open, handleOpenChange } = useTraceDisclosureState({
    isStreaming,
    collapseOnComplete,
  });

  const allowGroupExpand = !disableGroupExpansionWhileStreaming || !isStreaming;

  return (
    <ChainOfThoughtRoot
      open={open}
      onOpenChange={handleOpenChange}
      {...rootProps}
    >
      <ChainOfThoughtTrigger
        active={isStreaming}
        label={isStreaming ? label : summaryLabel}
        {...triggerProps}
      />
      <ChainOfThoughtContent aria-busy={isStreaming} {...contentProps}>
        <ChainOfThoughtTraceNodes
          trace={trace}
          windowSize={isStreaming ? windowSize : 0}
          windowTransition={isStreaming && windowTransition}
          allowGroupExpand={allowGroupExpand}
          {...timelineProps}
        />
      </ChainOfThoughtContent>
    </ChainOfThoughtRoot>
  );
}

function ChainOfThoughtTraceDisclosureParts({
  label = "Working...",
  summary,
  windowSize = 3,
  windowTransition = true,
  collapseOnComplete = true,
  disableGroupExpansionWhileStreaming = true,
  rootProps,
  triggerProps,
  contentProps,
  groupingFunction = groupMessagePartsByParentId,
  inferStep = defaultInferStep,
  ...timelineProps
}: ChainOfThoughtTracePartsProps & ChainOfThoughtTraceDisclosureSharedProps) {
  const messageStatus = useAuiState(({ message }) => message.status?.type);
  const isStreaming =
    messageStatus === "running" || messageStatus === "requires-action";
  const messageParts = useAuiState(({ message }) => message.parts);

  const stats = useMemo(() => {
    if (messageParts.length === 0) {
      return { totalSteps: 0, searchSteps: 0, toolSteps: 0 };
    }
    const inferredTrace = traceFromMessageParts(messageParts, {
      groupingFunction,
      inferStep,
    });
    return collectTraceStats(inferredTrace);
  }, [groupingFunction, inferStep, messageParts]);

  const durationSec = useTraceDuration(isStreaming);
  const summaryLabel = useMemo(() => {
    if (typeof summary === "string") return summary;
    if (typeof summary === "function") {
      return summary({ ...stats, durationSec });
    }
    return summarizeTraceStats(stats, durationSec);
  }, [durationSec, stats, summary]);

  const { open, handleOpenChange } = useTraceDisclosureState({
    isStreaming,
    collapseOnComplete,
  });

  return (
    <ChainOfThoughtRoot
      open={open}
      onOpenChange={handleOpenChange}
      {...rootProps}
    >
      <ChainOfThoughtTrigger
        active={isStreaming}
        label={isStreaming ? label : summaryLabel}
        {...triggerProps}
      />
      <ChainOfThoughtContent aria-busy={isStreaming} {...contentProps}>
        <ChainOfThoughtTraceParts
          groupingFunction={groupingFunction}
          inferStep={inferStep}
          windowSize={isStreaming ? windowSize : 0}
          windowTransition={isStreaming && windowTransition}
          {...timelineProps}
        />
      </ChainOfThoughtContent>
    </ChainOfThoughtRoot>
  );
}

function ChainOfThoughtTraceDisclosure(
  props: ChainOfThoughtTraceDisclosureProps,
) {
  if ("trace" in props && props.trace !== undefined) {
    return <ChainOfThoughtTraceDisclosureNodes {...props} />;
  }
  return <ChainOfThoughtTraceDisclosureParts {...props} />;
}

/**
 * Trace renderer that supports both legacy message-part grouping and explicit trace nodes.
 */
function ChainOfThoughtTrace(props: ChainOfThoughtTraceProps) {
  if ("trace" in props && props.trace !== undefined) {
    const { trace, nodeComponents, maxDepth, ...timelineProps } = props;
    return (
      <ChainOfThoughtTraceNodes
        trace={trace}
        nodeComponents={nodeComponents}
        maxDepth={maxDepth ?? 2}
        {...timelineProps}
      />
    );
  }

  return <ChainOfThoughtTraceParts {...props} />;
}

/**
 * Inline tool renderer for ChainOfThought traces.
 * Renders tool calls as inline badges instead of nested collapsibles.
 * Use as `components.tools.Override` in ChainOfThought.Trace.
 */
const ChainOfThoughtTraceTool = memo(function ChainOfThoughtTraceTool({
  toolName,
  status,
}: {
  toolName: string;
  argsText?: string;
  result?: unknown;
  status?: { type: string; reason?: string; error?: unknown };
}) {
  const badgeStatus: "running" | "complete" | "error" =
    status?.type === "running"
      ? "running"
      : status?.type === "incomplete"
        ? "error"
        : "complete";

  return <ChainOfThoughtToolBadge toolName={toolName} status={badgeStatus} />;
});

/**
 * Default implementation for rendering reasoning message parts.
 */
const ChainOfThoughtImpl: ReasoningMessagePartComponent = () => (
  <MarkdownText />
);

/**
 * Groups consecutive reasoning parts with streaming-aware behavior.
 * Auto-opens when streaming, respects user toggle.
 */
const ChainOfThoughtGroupImpl: ReasoningGroupComponent = ({
  children,
  startIndex,
  endIndex,
}) => {
  const [userDismissed, setUserDismissed] = useState(false);

  const isMessageRunning = useAuiState(
    ({ message }) => message.status?.type === "running",
  );

  const isReasoningStreaming = useAuiState(({ message }) => {
    if (message.status?.type !== "running") return false;
    const lastIndex = message.parts.length - 1;
    if (lastIndex < 0) return false;
    const lastType = message.parts[lastIndex]?.type;
    if (lastType !== "reasoning") return false;
    return lastIndex >= startIndex && lastIndex <= endIndex;
  });

  const [open, setOpen] = useState(isReasoningStreaming);

  const hasContent = useAuiState(({ message }) => {
    for (let i = startIndex; i <= endIndex && i < message.parts.length; i++) {
      const part = message.parts[i];
      if (part?.type === "reasoning" && part.text?.trim()) {
        return true;
      }
    }
    return false;
  });

  useEffect(() => {
    if (isReasoningStreaming && !userDismissed) {
      setOpen(true);
    }
  }, [isReasoningStreaming, userDismissed]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen && isMessageRunning) {
        setUserDismissed(true);
      }
    },
    [isMessageRunning],
  );

  return (
    <ChainOfThoughtRoot open={open} onOpenChange={handleOpenChange}>
      <ChainOfThoughtTrigger active={isReasoningStreaming} />
      <ChainOfThoughtContent aria-busy={isReasoningStreaming}>
        {hasContent ? (
          <ChainOfThoughtText autoScroll={isReasoningStreaming}>
            {children}
          </ChainOfThoughtText>
        ) : (
          <ChainOfThoughtPlaceholder />
        )}
      </ChainOfThoughtContent>
    </ChainOfThoughtRoot>
  );
};

const ChainOfThought = memo(
  ChainOfThoughtImpl,
) as unknown as ReasoningMessagePartComponent & {
  Root: typeof ChainOfThoughtRoot;
  Trigger: typeof ChainOfThoughtTrigger;
  Content: typeof ChainOfThoughtContent;
  Text: typeof ChainOfThoughtText;
  Fade: typeof ChainOfThoughtFade;
  Placeholder: typeof ChainOfThoughtPlaceholder;
  Trace: typeof ChainOfThoughtTrace;
  TraceDisclosure: typeof ChainOfThoughtTraceDisclosure;
  Timeline: typeof ChainOfThoughtTimeline;
  Step: typeof ChainOfThoughtStep;
  StepHeader: typeof ChainOfThoughtStepHeader;
  StepBody: typeof ChainOfThoughtStepBody;
  StepBadges: typeof ChainOfThoughtStepBadges;
  StepImage: typeof ChainOfThoughtStepImage;
  Badge: typeof ChainOfThoughtBadge;
  ToolBadge: typeof ChainOfThoughtToolBadge;
  TraceTool: typeof ChainOfThoughtTraceTool;
  Announcer: typeof ChainOfThoughtAnnouncer;
};

ChainOfThought.displayName = "ChainOfThought";
ChainOfThought.Root = ChainOfThoughtRoot;
ChainOfThought.Trigger = ChainOfThoughtTrigger;
ChainOfThought.Content = ChainOfThoughtContent;
ChainOfThought.Text = ChainOfThoughtText;
ChainOfThought.Fade = ChainOfThoughtFade;
ChainOfThought.Placeholder = ChainOfThoughtPlaceholder;
ChainOfThought.Trace = ChainOfThoughtTrace;
ChainOfThought.TraceDisclosure = ChainOfThoughtTraceDisclosure;
ChainOfThought.Timeline = ChainOfThoughtTimeline;
ChainOfThought.Step = ChainOfThoughtStep;
ChainOfThought.StepHeader = ChainOfThoughtStepHeader;
ChainOfThought.StepBody = ChainOfThoughtStepBody;
ChainOfThought.StepBadges = ChainOfThoughtStepBadges;
ChainOfThought.StepImage = ChainOfThoughtStepImage;
ChainOfThought.Badge = ChainOfThoughtBadge;
ChainOfThought.ToolBadge = ChainOfThoughtToolBadge;
ChainOfThought.TraceTool = ChainOfThoughtTraceTool;
ChainOfThought.Announcer = ChainOfThoughtAnnouncer;

const ChainOfThoughtGroup = memo(ChainOfThoughtGroupImpl);
ChainOfThoughtGroup.displayName = "ChainOfThoughtGroup";

export {
  ChainOfThought,
  ChainOfThoughtGroup,
  ChainOfThoughtRoot,
  ChainOfThoughtTrigger,
  ChainOfThoughtContent,
  ChainOfThoughtText,
  ChainOfThoughtFade,
  ChainOfThoughtPlaceholder,
  ChainOfThoughtTrace,
  ChainOfThoughtTraceDisclosure,
  ChainOfThoughtTimeline,
  ChainOfThoughtStep,
  ChainOfThoughtStepHeader,
  ChainOfThoughtStepBody,
  ChainOfThoughtStepBadges,
  ChainOfThoughtStepImage,
  ChainOfThoughtBadge,
  ChainOfThoughtToolBadge,
  ChainOfThoughtTraceTool,
  ChainOfThoughtAnnouncer,
  chainOfThoughtVariants,
  stepVariants,
  stepTypeIcons,
};

export type {
  ChainOfThoughtTraceDisclosureProps,
  ChainOfThoughtTraceGroupSummaryProps,
  ChainOfThoughtTraceNodeComponents,
  TraceFromMessagePartsOptions,
  TraceFromThreadMessageOptions,
  TraceGroup,
  TraceNode,
  TraceStatus,
  TraceStep,
};
