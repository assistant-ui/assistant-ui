"use client";

import { useEffect, type ReactNode } from "react";
import { type VariantProps } from "class-variance-authority";
import { ChevronDownIcon } from "lucide-react";
import {
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DisclosureRoot,
  type DisclosureRootProps,
} from "@/components/assistant-ui/disclosure";
import { cn } from "@/lib/utils";
import type { ChainOfThoughtPhase } from "./model";
import {
  ANIMATION_DURATION,
  EASE_OUT_EXPO,
  SPRING_EASING,
  STEP_STAGGER_DELAY,
  chainOfThoughtVariants,
} from "./styles";
import { Crossfade } from "./crossfade";

export type ChainOfThoughtRootProps = DisclosureRootProps &
  VariantProps<typeof chainOfThoughtVariants>;

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

export type ChainOfThoughtTriggerProps = React.ComponentProps<
  typeof CollapsibleTrigger
> & {
  phase?: ChainOfThoughtPhase;
  isOpen?: boolean;
  activityLabel?: string;
  renderTriggerContent?: (args: {
    reasoningLabel: string;
    displayLabel: string;
    activityLabel: string | undefined;
    phase: ChainOfThoughtPhase;
    isOpen: boolean;
    elapsedSeconds: number | undefined;
    label: string;
    activity: string | undefined;
    active: boolean;
    open: boolean;
    duration: number | undefined;
  }) => ReactNode;
  elapsedSeconds?: number | undefined;
  reasoningLabel?: string;
};

function ChainOfThoughtTrigger({
  phase = "idle",
  isOpen,
  activityLabel,
  renderTriggerContent,
  elapsedSeconds,
  reasoningLabel = "Reasoning",
  className,
  ...props
}: ChainOfThoughtTriggerProps) {
  const isActivePhase = phase === "running" || phase === "requires-action";
  const displayLabel = elapsedSeconds
    ? `${reasoningLabel} (${elapsedSeconds}s)`
    : reasoningLabel;
  const fallbackLabel =
    reasoningLabel !== "Reasoning" ? reasoningLabel : "Thinking...";
  const primaryLabel = activityLabel ?? fallbackLabel;
  const hasCustomTriggerContent = renderTriggerContent !== undefined;
  const customTriggerContent = hasCustomTriggerContent
    ? renderTriggerContent({
        reasoningLabel,
        displayLabel,
        activityLabel,
        phase,
        isOpen: !!isOpen,
        elapsedSeconds,
        label: reasoningLabel,
        activity: activityLabel,
        active: isActivePhase,
        open: !!isOpen,
        duration: elapsedSeconds,
      })
    : undefined;

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
                "group-data-[state=closed]/trigger:-rotate-90",
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

function ChainOfThoughtContent({
  className,
  children,
  style,
  showFade = true,
  ...props
}: React.ComponentProps<typeof CollapsibleContent> & {
  showFade?: boolean;
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
