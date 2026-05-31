"use client";

import type { ReactNode } from "react";
import { ChevronDownIcon } from "lucide-react";
import { CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useChainOfThoughtStrings } from "./strings";
import type { ChainOfThoughtPhase } from "./model";
import { useDisclosureOpenState } from "./disclosure-base";
import { Crossfade } from "./crossfade";

export type ChainOfThoughtTriggerProps = React.ComponentProps<
  typeof CollapsibleTrigger
> & {
  phase?: ChainOfThoughtPhase | undefined;
  isOpen?: boolean | undefined;
  activityLabel?: string | undefined;
  elapsedSeconds?: number | undefined;
  reasoningLabel?: string | undefined;
  streamingLabel?: string | undefined;
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

export function ChainOfThoughtTrigger({
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
        "text-muted-foreground hover:text-foreground text-sm transition-colors",
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
                "rtl:group-data-[state=closed]/trigger:rotate-90",
                "group-data-[state=open]/trigger:rotate-0",
              )}
            />
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              <div
                data-slot="chain-of-thought-trigger-reasoning-label"
                className="aui-chain-of-thought-trigger-reasoning-label text-foreground max-w-[24ch] shrink-0 truncate font-medium"
              >
                {displayLabel}
              </div>
              <div
                data-slot="chain-of-thought-trigger-activity"
                className="aui-chain-of-thought-trigger-activity text-foreground relative flex min-w-[12ch] flex-1 items-center font-medium"
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
                            "aui-chain-of-thought-trigger-activity-shimmer shimmer text-foreground/40 pointer-events-none absolute inset-0",
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
