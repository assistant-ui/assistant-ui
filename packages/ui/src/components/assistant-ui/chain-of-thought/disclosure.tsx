"use client";

import type { ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";
import { ChevronDownIcon } from "lucide-react";
import {
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DisclosureRoot,
  type DisclosureRootProps,
  useDisclosureOpenState,
} from "./disclosure-base";
import { cn } from "@/lib/utils";
import { useChainOfThoughtStrings } from "./strings";
import type { ChainOfThoughtPhase } from "./model";
import {
  ANIMATION_DURATION,
  EASE_OUT_EXPO,
  SPRING_EASING,
  STEP_STAGGER_DELAY,
  chainOfThoughtVariants,
} from "./styles";
import { Crossfade } from "./crossfade";

/** Props for the ChainOfThought collapsible root primitive. */
export type ChainOfThoughtRootProps = DisclosureRootProps &
  VariantProps<typeof chainOfThoughtVariants>;

/** Collapsible container that applies ChainOfThought variants and motion tokens. */
function ChainOfThoughtRoot({
  className,
  variant,
  children,
  style,
  ...props
}: ChainOfThoughtRootProps) {
  return (
    <DisclosureRoot
      data-slot="chain-of-thought-root"
      data-variant={variant}
      animationDuration={ANIMATION_DURATION}
      lockOnProgrammaticClose
      className={cn(
        "group/chain-of-thought-root",
        chainOfThoughtVariants({ variant, className }),
      )}
      style={
        {
          "--spring-easing": SPRING_EASING,
          "--ease-out-expo": EASE_OUT_EXPO,
          "--step-stagger-delay": `${STEP_STAGGER_DELAY}ms`,
          ...(style ?? {}),
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </DisclosureRoot>
  );
}

/** Props for the ChainOfThought trigger primitive. */
export type ChainOfThoughtTriggerProps = React.ComponentProps<
  typeof CollapsibleTrigger
> & {
  phase?: ChainOfThoughtPhase | undefined;
  isOpen?: boolean | undefined;
  activityLabel?: string | undefined;
  elapsedSeconds?: number | undefined;
  reasoningLabel?: string | undefined;
  /** Fallback label shown while streaming with no resolved activity. */
  streamingLabel?: string | undefined;
  /**
   * Render a custom trigger body. Receives the resolved trigger state so the
   * caller can build their own label/affordance composition.
   *
   * Accessibility: this replaces the entire default trigger body (including the
   * chevron). Make sure your content includes a visible text label or pass an
   * `aria-label` so the toggle button keeps an accessible name; consider
   * re-including a disclosure indicator for sighted users.
   */
  renderTriggerContent?:
    | ((args: {
        phase: ChainOfThoughtPhase;
        isOpen: boolean;
        reasoningLabel: string;
        activityLabel: string | undefined;
        elapsedSeconds: number | undefined;
      }) => ReactNode)
    | undefined;
};

/** Trigger button with phase-aware labels, shimmer, and custom render support. */
function ChainOfThoughtTrigger({
  phase = "idle",
  isOpen,
  activityLabel,
  renderTriggerContent,
  elapsedSeconds,
  reasoningLabel,
  streamingLabel,
  className,
  ...props
}: ChainOfThoughtTriggerProps) {
  // Fall back to the strings seam (defaults to English) so the standalone
  // primitive localizes via context without every caller threading the props.
  const strings = useChainOfThoughtStrings();
  const resolvedReasoningLabel = reasoningLabel ?? strings.reasoning;
  const resolvedStreamingLabel = streamingLabel ?? strings.thinking;
  const resolvedIsOpen = useDisclosureOpenState() ?? isOpen ?? false;
  const isActivePhase = phase === "running" || phase === "requires-action";
  const displayLabel = elapsedSeconds
    ? `${resolvedReasoningLabel} (${elapsedSeconds}s)`
    : resolvedReasoningLabel;
  const primaryLabel = activityLabel ?? resolvedStreamingLabel;
  const customTriggerContent = renderTriggerContent?.({
    phase,
    isOpen: resolvedIsOpen,
    reasoningLabel: resolvedReasoningLabel,
    activityLabel,
    elapsedSeconds,
  });
  const hasCustomTriggerContent = customTriggerContent !== undefined;

  return (
    <CollapsibleTrigger
      data-slot="chain-of-thought-trigger"
      className={cn(
        "aui-chain-of-thought-trigger",
        "group/trigger flex w-full items-start gap-3 py-1.5 text-left",
        "text-muted-foreground text-sm transition-colors hover:text-foreground",
        className,
      )}
      {...props}
    >
      <div
        data-slot="chain-of-thought-trigger-label"
        className="aui-chain-of-thought-trigger-label-wrapper min-w-0 leading-6"
      >
        {hasCustomTriggerContent ? (
          customTriggerContent
        ) : (
          <div className="relative flex w-full min-w-0 items-center gap-1.5">
            <ChevronDownIcon
              data-slot="chain-of-thought-trigger-chevron"
              className={cn(
                "aui-chain-of-thought-trigger-chevron inline-block size-4 shrink-0",
                "transition-transform duration-(--animation-duration) ease-(--spring-easing)",
                "motion-reduce:transition-none",
                "group-data-[state=closed]/trigger:-rotate-90",
                // Mirror the collapsed rotation for RTL so the chevron still
                // points toward the disclosure's reading direction.
                "rtl:group-data-[state=closed]/trigger:rotate-90",
                "group-data-[state=open]/trigger:rotate-0",
              )}
            />
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              <div
                data-slot="chain-of-thought-trigger-reasoning-label"
                className="aui-chain-of-thought-trigger-reasoning-label max-w-[24ch] shrink-0 truncate font-medium text-foreground"
              >
                {displayLabel}
              </div>
              <div
                data-slot="chain-of-thought-trigger-activity"
                className="aui-chain-of-thought-trigger-activity relative flex min-w-[12ch] flex-1 items-center font-medium text-foreground"
              >
                <Crossfade
                  value={primaryLabel}
                  exitDuration={200}
                  enterDuration={320}
                  enterDelay={70}
                  className="h-6 w-full min-w-0 items-center"
                >
                  {(nextActivityLabel) => (
                    <div className="shimmer-container relative flex w-full min-w-0 items-center truncate">
                      {nextActivityLabel}
                      {isActivePhase && (
                        <span
                          aria-hidden
                          data-slot="chain-of-thought-trigger-activity-shimmer"
                          className={cn(
                            "aui-chain-of-thought-trigger-activity-shimmer shimmer pointer-events-none absolute inset-0 text-foreground/40",
                            "motion-reduce:animate-none",
                          )}
                        >
                          {nextActivityLabel}
                        </span>
                      )}
                    </div>
                  )}
                </Crossfade>
              </div>
            </div>
          </div>
        )}
      </div>
    </CollapsibleTrigger>
  );
}

/** Bottom fade used when ChainOfThought content is scroll constrained. */
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
        "group-data-[variant=muted]/chain-of-thought-root:bg-[linear-gradient(to_top,var(--color-muted),transparent)]",
        "dark:group-data-[variant=muted]/chain-of-thought-root:bg-[linear-gradient(to_top,var(--color-card),transparent)]",
        "fade-in-0 animate-in duration-(--animation-duration)",
        "group-data-[state=open]/collapsible-content:animate-out",
        "group-data-[state=open]/collapsible-content:fade-out-0",
        "group-data-[state=open]/collapsible-content:delay-[calc(var(--animation-duration)*0.75)]",
        "group-data-[state=open]/collapsible-content:fill-mode-forwards",
        "group-data-[state=open]/collapsible-content:duration-(--animation-duration)",
        "motion-reduce:animate-none motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

/** Animated disclosure body for ChainOfThought timelines and free-form content. */
function ChainOfThoughtContent({
  className,
  children,
  style,
  showFade = true,
  ...props
}: React.ComponentProps<typeof CollapsibleContent> & {
  showFade?: boolean | undefined;
}) {
  return (
    <CollapsibleContent
      data-slot="chain-of-thought-content"
      className={cn(
        "aui-chain-of-thought-content",
        "relative overflow-hidden text-muted-foreground text-sm outline-none",
        "group/collapsible-content",
        "data-[state=open]:animate-collapsible-down",
        "data-[state=open]:fill-mode-backwards",
        "data-[state=open]:duration-(--animation-duration)",
        "data-[state=open]:ease-(--spring-easing)",
        "data-[state=closed]:animate-collapsible-up",
        "data-[state=closed]:delay-[calc(var(--animation-duration)*0.35)]",
        "data-[state=closed]:duration-[calc(var(--animation-duration)*0.6)]",
        "data-[state=closed]:ease-(--ease-out-expo)",
        "data-[state=closed]:fill-mode-both",
        "data-[state=closed]:pointer-events-none",
        "motion-reduce:animate-none motion-reduce:transition-none",
        className,
      )}
      {...props}
      style={style}
    >
      {children}
      {showFade ? <ChainOfThoughtFade /> : null}
    </CollapsibleContent>
  );
}

export {
  ChainOfThoughtRoot,
  ChainOfThoughtTrigger,
  ChainOfThoughtContent,
  ChainOfThoughtFade,
};
