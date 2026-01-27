"use client";

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  memo,
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
 * Spring-like easing curve with subtle overshoot for natural motion.
 * Gentle spring that settles smoothly without excessive bounce.
 */
const SPRING_EASING = "cubic-bezier(0.62, -0.05, 0.71, 1.15)";

/**
 * Smooth deceleration curve for collapsing motions.
 */
const EASE_OUT_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";

/**
 * Stagger delay between timeline steps (in ms).
 */
const STEP_STAGGER_DELAY = 40;

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
    // Staggered reveal animation
    "translate-y-1 opacity-0",
    "group-data-[state=open]/collapsible-content:opacity-100",
    "group-data-[state=open]/collapsible-content:translate-y-0",
    "transition-[opacity,transform] duration-(--animation-duration) ease-(--spring-easing)",
    // Stagger delay based on step index
    "[transition-delay:calc(var(--step-index,0)*var(--step-stagger-delay,40ms))]",
    // Skip stagger when closing (all steps hide together)
    "group-data-[state=closed]/collapsible-content:[transition-delay:0ms]",
    "group-data-[state=closed]/collapsible-content:duration-[100ms]",
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
        "group/trigger flex max-w-full items-start gap-3 py-1 text-left",
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
            // Spring easing for natural rotation with slight overshoot
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
    scrollEl.scrollTop = scrollEl.scrollHeight;
    // Reset user scrolling flag after a tick
    requestAnimationFrame(() => {
      isUserScrollingRef.current = true;
    });
  }, [contentKey, enabled, isScrolledUp, scrollEl]);

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
    scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: "smooth" });
    setIsScrolledUp(false);
    requestAnimationFrame(() => {
      isUserScrollingRef.current = true;
    });
  }, [scrollEl]);

  return { isScrolledUp, scrollToBottom };
}

/**
 * "Jump to latest" button for scrollable containers.
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
        "aui-chain-of-thought-jump-to-latest absolute right-2 bottom-10 z-20",
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
      Jump to latest
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
          className="aui-chain-of-thought-cursor ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground/70 align-text-bottom"
        />
      )}
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
};

/**
 * Timeline container with vertical connecting line.
 * Use with ChainOfThoughtStep children for step-by-step visualization.
 * Injects --step-index CSS custom property for staggered animations.
 */
function ChainOfThoughtTimeline({
  className,
  autoScroll = false,
  children,
  ...props
}: ChainOfThoughtTimelineProps) {
  const [scrollEl, setScrollEl] = useState<HTMLUListElement | null>(null);
  const { isScrolledUp, scrollToBottom } = useAutoScroll(
    scrollEl,
    children,
    autoScroll,
  );

  const childrenArray = Children.toArray(children);
  const stepCount = childrenArray.filter(isValidElement).length;

  // Inject step indices for staggered animations
  let stepIndex = 0;
  const staggeredChildren = childrenArray.map((child) => {
    if (!isValidElement(child)) return child;

    const cloned = cloneElement(child, {
      style: {
        ...((child.props as { style?: React.CSSProperties }).style || {}),
        "--step-index": stepIndex,
      } as React.CSSProperties,
    } as React.HTMLAttributes<HTMLElement>);

    stepIndex += 1;
    return cloned;
  });

  return (
    <ul
      ref={(el) => setScrollEl(el)}
      data-slot="chain-of-thought-timeline"
      data-step-count={stepCount}
      className={cn(
        "aui-chain-of-thought-timeline",
        "relative z-0 max-h-64 overflow-y-auto",
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
        className,
      )}
      {...props}
    >
      {staggeredChildren}
      {autoScroll && (
        <JumpToLatestButton onClick={scrollToBottom} visible={isScrolledUp} />
      )}
    </ul>
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
  };

/**
 * Render a step indicator icon with consistent wrapper styling.
 * Includes pulsing ring animation for active status and scale pop for completion.
 */
function StepIndicatorWrapper({
  status,
  hasBorder = false,
  children,
}: {
  status: StepStatus | undefined;
  hasBorder?: boolean;
  children: ReactNode;
}) {
  const [isCompleting, setIsCompleting] = useState(false);
  const previousStatusRef = useRef<StepStatus | undefined>(status);

  const isActive = status === "active";
  const isComplete = status === "complete";
  const isPending = status === "pending";
  const isError = status === "error";

  // Trigger a subtle "pop" when the status transitions into complete.
  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (isComplete && previousStatus !== "complete") {
      setIsCompleting(true);
      const timer = setTimeout(() => setIsCompleting(false), 200);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [isComplete, status]);

  return (
    <span
      data-slot="chain-of-thought-step-indicator"
      data-status={status}
      className={cn(
        "aui-chain-of-thought-step-indicator transform-gpu",
        "relative flex size-6 shrink-0 items-center justify-center rounded-full",
        // Background should match the parent variant so the timeline line does not show through
        "bg-background",
        "group-data-[variant=muted]/chain-of-thought-root:bg-muted",
        "group-data-[variant=muted]/chain-of-thought-root:dark:bg-card",
        // Smooth transitions for status changes
        "transition-[border-color,background-color,box-shadow,transform] duration-200 ease-(--spring-easing)",
        // Pop micro-interaction (no custom keyframes)
        "scale-100",
        isCompleting && "scale-[1.08] motion-reduce:scale-100",
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
      {/* Pulsing ring for active status */}
      {isActive && (
        <span
          aria-hidden
          className={cn(
            "aui-chain-of-thought-step-indicator-ring absolute inset-0 rounded-full bg-primary/20",
            "animate-ping [animation-duration:1.5s]",
            "motion-reduce:animate-none",
          )}
        />
      )}
      {children}
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

  const renderIndicator = () => {
    // Error state shows error icon
    if (effectiveStatus === "error") {
      return (
        <StepIndicatorWrapper status={effectiveStatus} hasBorder={!!stepLabel}>
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
        <StepIndicatorWrapper status={effectiveStatus} hasBorder>
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
        <StepIndicatorWrapper status={effectiveStatus}>
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
        <StepIndicatorWrapper status={effectiveStatus}>
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
      className={cn(
        stepVariants({ status: effectiveStatus, className }),
        // Hide connectors at first/last positions using CSS selectors
        // Uses first-of-type/last-of-type for compatibility with dynamically rendered children
        "first-of-type:[&>[data-slot=chain-of-thought-step-connector-above]]:hidden",
        "last-of-type:[&>[data-slot=chain-of-thought-step-connector-below]]:hidden",
      )}
      {...props}
    >
      {/* Connector from previous step - renders from step top to icon top */}
      <div
        aria-hidden="true"
        data-slot="chain-of-thought-step-connector-above"
        className="pointer-events-none absolute top-0 left-3 h-1.5 w-px bg-foreground/15"
      />
      {/* Connector to next step - renders from icon bottom to step bottom */}
      <div
        aria-hidden="true"
        data-slot="chain-of-thought-step-connector-below"
        className="pointer-events-none absolute top-[30px] bottom-0 left-3 w-px bg-foreground/15"
      />

      <div className="aui-chain-of-thought-step-indicator-wrapper relative z-10">
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
        )}
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
};

/**
 * Inline tool badge for displaying tool calls within ChainOfThought traces.
 * A flattened, non-collapsible alternative to ToolFallback for less visual clutter.
 */
function ChainOfThoughtToolBadge({
  toolName,
  status = "complete",
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
      <span className="aui-chain-of-thought-tool-badge-name">{toolName}</span>
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

export type ChainOfThoughtTraceStepMeta = {
  label?: ReactNode;
  type?: StepType;
  status?: StepStatus;
  stepLabel?: string | number;
  icon?: LucideIcon | ReactNode;
};

export type ChainOfThoughtTraceProps = Omit<
  React.ComponentProps<typeof ChainOfThoughtTimeline>,
  "children"
> & {
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

type ToolCallPartLike = {
  type: "tool-call";
  toolName?: string;
};

const isToolCallPart = (part: unknown): part is ToolCallPartLike =>
  isRecord(part) && part["type"] === "tool-call";

const defaultInferStep: NonNullable<ChainOfThoughtTraceProps["inferStep"]> = ({
  groupKey,
  parts,
}) => {
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

type ChainOfThoughtTraceContextValue = {
  inferStep: NonNullable<ChainOfThoughtTraceProps["inferStep"]>;
};

const ChainOfThoughtTraceContext =
  createContext<ChainOfThoughtTraceContextValue | null>(null);

function ChainOfThoughtTraceGroup({
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
function ChainOfThoughtTrace({
  className,
  groupingFunction = groupMessagePartsByParentId,
  components,
  inferStep = defaultInferStep,
  ...timelineProps
}: ChainOfThoughtTraceProps) {
  const contextValue = useMemo(() => ({ inferStep }), [inferStep]);
  const groupedComponents = useMemo(
    () => ({
      ...components,
      Group: ChainOfThoughtTraceGroup,
    }),
    [components],
  );

  return (
    <ChainOfThoughtTimeline className={className} {...timelineProps}>
      <ChainOfThoughtTraceContext.Provider value={contextValue}>
        <MessagePrimitive.Unstable_PartsGrouped
          groupingFunction={groupingFunction}
          components={groupedComponents}
        />
      </ChainOfThoughtTraceContext.Provider>
    </ChainOfThoughtTimeline>
  );
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
