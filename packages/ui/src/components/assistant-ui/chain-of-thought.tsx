"use client";

import {
  createContext,
  memo,
  useCallback,
  useContext,
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
  CircleIcon,
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
 * Map of step types to their default icons.
 * Extend this record to add custom step types.
 */
const stepTypeIcons = {
  search: SearchIcon,
  image: ImageIcon,
  text: FileTextIcon,
  tool: WrenchIcon,
  complete: CheckCircleIcon,
  default: CircleIcon,
} as const satisfies Record<string, LucideIcon>;

export type StepType = keyof typeof stepTypeIcons;
export type StepStatus = "pending" | "active" | "complete";

/** Animation classes shared across content elements */
const contentAnimationClasses = cn(
  "transform-gpu transition-[transform,opacity]",
  "group-data-[state=open]/collapsible-content:animate-in",
  "group-data-[state=closed]/collapsible-content:animate-out",
  "group-data-[state=open]/collapsible-content:fade-in-0",
  "group-data-[state=closed]/collapsible-content:fade-out-0",
  "group-data-[state=open]/collapsible-content:slide-in-from-top-4",
  "group-data-[state=closed]/collapsible-content:slide-out-to-top-4",
  "group-data-[state=open]/collapsible-content:duration-(--animation-duration)",
  "group-data-[state=closed]/collapsible-content:duration-(--animation-duration)",
);

/**
 * Background classes that match the container variant.
 * Used by icons and line terminators to cover the timeline line.
 */
const variantBackgroundClasses = cn(
  "bg-background",
  "group-data-[variant=muted]/chain-of-thought-root:bg-muted",
  "group-data-[variant=muted]/chain-of-thought-root:dark:bg-card",
);

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
  "aui-chain-of-thought-step relative flex items-start gap-3 py-1.5",
  {
    variants: {
      status: {
        pending: "",
        active: "",
        complete: "",
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

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) lockScroll();
      if (!isControlled) setUncontrolledOpen(open);
      controlledOnOpenChange?.(open);
    },
    [lockScroll, isControlled, controlledOnOpenChange],
  );

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
        "group/trigger flex max-w-[75%] items-center gap-3 py-1",
        "text-muted-foreground text-sm transition-colors hover:text-foreground",
        className,
      )}
      {...props}
    >
      <span
        data-slot="chain-of-thought-trigger-icon-wrapper"
        className="flex size-6 shrink-0 items-center justify-center"
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
            className="aui-chain-of-thought-trigger-shimmer shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none"
          >
            {displayLabel}
          </span>
        )}
      </span>

      <ChevronDownIcon
        data-slot="chain-of-thought-trigger-chevron"
        className={cn(
          "aui-chain-of-thought-trigger-chevron size-4 shrink-0",
          "transition-transform duration-(--animation-duration) ease-out",
          "group-data-[state=closed]/trigger:-rotate-90",
          "group-data-[state=open]/trigger:rotate-0",
        )}
      />
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
        "group/collapsible-content ease-out",
        "data-[state=closed]:animate-collapsible-up",
        "data-[state=open]:animate-collapsible-down",
        "data-[state=closed]:fill-mode-forwards",
        "data-[state=closed]:pointer-events-none",
        "data-[state=open]:duration-(--animation-duration)",
        "data-[state=closed]:duration-(--animation-duration)",
        className,
      )}
      {...props}
    >
      <div
        data-slot="chain-of-thought-content-connector"
        className="absolute top-0 left-3 h-4 w-px bg-foreground/15"
        aria-hidden="true"
      />
      {children}
      <ChainOfThoughtFade />
    </CollapsibleContent>
  );
}

/**
 * Text content container with scroll and animation.
 */
function ChainOfThoughtText({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chain-of-thought-text"
      className={cn(
        "aui-chain-of-thought-text",
        "relative z-0 max-h-64 overflow-y-auto pt-2 pb-2 pl-6 leading-relaxed",
        contentAnimationClasses,
        className,
      )}
      {...props}
    />
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
        "py-2 pl-6 text-muted-foreground/70 italic",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Timeline container with vertical connecting line.
 * Use with ChainOfThoughtStep children for step-by-step visualization.
 */
function ChainOfThoughtTimeline({
  className,
  children,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="chain-of-thought-timeline"
      className={cn(
        "aui-chain-of-thought-timeline",
        "relative z-0 max-h-64 overflow-y-auto",
        "flex flex-col pt-1 pb-2",
        contentAnimationClasses,
        className,
      )}
      {...props}
    >
      <div
        data-slot="chain-of-thought-timeline-line"
        className="absolute top-5 bottom-4 left-3 w-px bg-foreground/15"
        aria-hidden="true"
      />
      {children}
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
  };

/**
 * Get status-based styling classes for step indicators.
 */
function getStatusClasses(status: StepStatus | undefined): string {
  switch (status) {
    case "active":
      return "text-primary";
    case "complete":
      return "text-muted-foreground";
    case "pending":
      return "text-muted-foreground/50";
    default:
      return "";
  }
}

/**
 * Render a step indicator icon with consistent wrapper styling.
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
  return (
    <span
      data-slot="chain-of-thought-step-indicator"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full",
        variantBackgroundClasses,
        hasBorder && "border",
        hasBorder &&
          status === "active" &&
          "border-primary bg-primary/10 shadow-[0_0_0_4px_hsl(var(--primary)/0.1)]",
        hasBorder && status === "complete" && "border-muted-foreground/40",
        hasBorder && status === "pending" && "border-muted-foreground/20",
        !hasBorder && getStatusClasses(status),
      )}
    >
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
  children,
  ...props
}: ChainOfThoughtStepProps) {
  const effectiveStatus: StepStatus = active
    ? "active"
    : (status ?? "complete");

  const renderIndicator = () => {
    // Numbered/labeled indicator
    if (stepLabel !== undefined) {
      return (
        <StepIndicatorWrapper status={effectiveStatus} hasBorder>
          <span
            className={cn(
              "font-medium text-[10px]",
              effectiveStatus === "active"
                ? "text-primary"
                : "text-muted-foreground",
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
            <IconRenderer
              Icon={icon as LucideIcon}
              status={effectiveStatus}
              pulse={active === true}
            />
          ) : (
            icon
          )}
        </StepIndicatorWrapper>
      );
    }

    // Type-based icon
    const TypeIcon = stepTypeIcons[type];
    return (
      <StepIndicatorWrapper status={effectiveStatus}>
        <IconRenderer
          Icon={TypeIcon}
          status={effectiveStatus}
          pulse={active === true}
        />
      </StepIndicatorWrapper>
    );
  };

  return (
    <li
      data-slot="chain-of-thought-step"
      data-status={effectiveStatus}
      data-type={type}
      className={cn(stepVariants({ status: effectiveStatus, className }))}
      {...props}
    >
      <div className="relative z-10">
        {renderIndicator()}
        {/* Line terminator - blocks timeline line below active steps */}
        {effectiveStatus === "active" && (
          <div
            data-slot="chain-of-thought-step-line-terminator"
            className={cn(
              "absolute top-full left-1/2 h-8 w-3 -translate-x-1/2",
              variantBackgroundClasses,
            )}
            aria-hidden="true"
          />
        )}
      </div>

      <div
        data-slot="chain-of-thought-step-content"
        className={cn(
          "aui-chain-of-thought-step-content",
          "min-w-0 flex-1 text-muted-foreground leading-relaxed",
          effectiveStatus === "active" && "text-foreground",
        )}
      >
        {children}
        {active && (
          <span
            aria-hidden
            data-slot="chain-of-thought-step-shimmer"
            className="aui-chain-of-thought-step-shimmer shimmer shimmer-invert pointer-events-none absolute inset-0 motion-reduce:animate-none"
          />
        )}
      </div>
    </li>
  );
}

/**
 * Renders a Lucide icon with status-based styling.
 */
function IconRenderer({
  Icon,
  status,
  pulse = false,
}: {
  Icon: LucideIcon;
  status: StepStatus | undefined;
  pulse?: boolean;
}) {
  return (
    <Icon
      className={cn(
        "size-5",
        getStatusClasses(status),
        pulse && "animate-pulse",
      )}
    />
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
      className={cn("aui-chain-of-thought-step-body", className)}
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
        "aui-chain-of-thought-step-badges mt-1.5 flex flex-wrap gap-1.5",
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
        className="max-h-48 w-auto rounded-lg border object-cover"
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
  const parentId = part.parentId;
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
  isRecord(part) && part.type === "tool-call";

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

  const isReasoningStreaming = useAuiState(({ message }) => {
    if (message.status?.type !== "running") return false;
    const lastIndex = message.parts.length - 1;
    if (lastIndex < 0) return false;
    const lastType = message.parts[lastIndex]?.type;
    if (lastType !== "reasoning") return false;
    return lastIndex >= startIndex && lastIndex <= endIndex;
  });

  const hasContent = useAuiState(({ message }) => {
    for (let i = startIndex; i <= endIndex && i < message.parts.length; i++) {
      const part = message.parts[i];
      if (part?.type === "reasoning" && part.text?.trim()) {
        return true;
      }
    }
    return false;
  });

  const shouldBeOpen = isReasoningStreaming && !userDismissed;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && isReasoningStreaming) {
        setUserDismissed(true);
      }
    },
    [isReasoningStreaming],
  );

  return (
    <ChainOfThoughtRoot
      defaultOpen={false}
      {...(shouldBeOpen ? { open: true } : {})}
      onOpenChange={handleOpenChange}
    >
      <ChainOfThoughtTrigger active={isReasoningStreaming} />
      <ChainOfThoughtContent aria-busy={isReasoningStreaming}>
        {hasContent ? (
          <ChainOfThoughtText>{children}</ChainOfThoughtText>
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
  chainOfThoughtVariants,
  stepVariants,
  stepTypeIcons,
};
