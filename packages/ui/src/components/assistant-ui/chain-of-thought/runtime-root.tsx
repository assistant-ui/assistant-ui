"use client";

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import {
  ChainOfThoughtPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import {
  ChainOfThoughtContent,
  ChainOfThoughtRoot,
  ChainOfThoughtTrigger,
  type ChainOfThoughtRootProps,
  type ChainOfThoughtTriggerProps,
} from "./disclosure";
import { ChainOfThoughtPlaceholder, ChainOfThoughtTimeline } from "./layout";
import { derivePhase, type ChainOfThoughtPhase } from "./model";
import {
  deriveCollapsedActivity,
  findLastReasoningOrToolPart,
  inferToolActivityStatusType,
  isCollapsedActivityReasoning,
  isMessageStatusStreaming,
  partStatusOrFallback,
  type ToolActivity,
} from "./runtime-activity";
import {
  ChainOfThoughtPrimitivePartLayout,
  ChainOfThoughtTerminalStep,
} from "./runtime-part-layout";
import { ChainOfThoughtPrimitiveToolWithLabels } from "./runtime-tool";
import { ToolActivityLabelsContext } from "./runtime-tool-context";
import { useElapsedSeconds } from "./trace-time";
import {
  ChainOfThoughtStringsContext,
  mergeChainOfThoughtStrings,
  type ChainOfThoughtStrings,
} from "./strings";

const chainOfThoughtPartComponents = {
  Reasoning: MarkdownText,
  tools: { Fallback: ChainOfThoughtPrimitiveToolWithLabels },
  Layout: ChainOfThoughtPrimitivePartLayout,
};

type ChainOfThoughtRuntimeTimelineProps = {
  partsLength: number;
  isChainStreaming: boolean;
  constrainHeight: boolean;
  phase: ChainOfThoughtPhase;
  terminalElapsedSeconds?: number | undefined;
  toolActivityLabels?: Record<string, ToolActivity> | undefined;
};

const ChainOfThoughtRuntimeTimeline = memo(
  function ChainOfThoughtRuntimeTimeline({
    partsLength,
    isChainStreaming,
    constrainHeight,
    phase,
    terminalElapsedSeconds,
    toolActivityLabels,
  }: ChainOfThoughtRuntimeTimelineProps) {
    if (partsLength === 0) {
      return <ChainOfThoughtPlaceholder />;
    }

    return (
      <ChainOfThoughtTimeline
        autoScroll={isChainStreaming}
        autoScrollKey={partsLength}
        autoScrollBehavior="smooth"
        constrainHeight={constrainHeight}
      >
        <ToolActivityLabelsContext.Provider value={toolActivityLabels}>
          <ChainOfThoughtPrimitive.Parts
            components={chainOfThoughtPartComponents}
          />
          {(phase === "complete" || phase === "incomplete") && (
            <ChainOfThoughtTerminalStep
              phase={phase}
              {...(terminalElapsedSeconds !== undefined
                ? { elapsedSeconds: terminalElapsedSeconds }
                : {})}
            />
          )}
        </ToolActivityLabelsContext.Provider>
      </ChainOfThoughtTimeline>
    );
  },
);

/** Props for the runtime-backed ChainOfThought component. */
export type ChainOfThoughtProps = {
  /** Caps the timeline height and shows a jump-to-latest affordance when needed. */
  constrainHeight?: boolean | undefined;
  /** Optional per-tool label resolvers for the collapsed activity line. */
  toolActivityLabels?: Record<string, ToolActivity> | undefined;
  /** Custom trigger body renderer for host-specific layouts. */
  renderTriggerContent?: ChainOfThoughtTriggerProps["renderTriggerContent"];
  /** Collapses the panel when a streaming chain reaches a terminal state. */
  autoCollapseOnComplete?: boolean | undefined;
  /** Visual chrome variant shared with `ChainOfThought.Root`. */
  variant?: ChainOfThoughtRootProps["variant"] | undefined;
  /** Overrides for the panel's user-facing strings (labels, terminal text). */
  strings?: Partial<ChainOfThoughtStrings> | undefined;
};

/** Runtime ChainOfThought implementation used by the compound export. */
export const ChainOfThoughtImpl = ({
  constrainHeight = false,
  toolActivityLabels,
  renderTriggerContent,
  autoCollapseOnComplete = true,
  variant = "ghost",
  strings: stringsProp,
}: ChainOfThoughtProps = {}) => {
  const aui = useAui();
  const rootRef = useRef<HTMLDivElement>(null);
  const strings = useMemo(
    () => mergeChainOfThoughtStrings(stringsProp),
    [stringsProp],
  );
  const collapsed = useAuiState((s) => s.chainOfThought.collapsed);
  const partsLength = useAuiState((s) => s.chainOfThought.parts.length);

  const collapsedActivity = useAuiState((s) =>
    deriveCollapsedActivity({
      parts: s.chainOfThought.parts,
      chainStatusType: s.chainOfThought.status.type,
      messageStatusType: s.message.status?.type,
      toolActivityLabels,
      reasoningActivity: strings.reasoningActivity,
    }),
  );
  // Resolved as a primitive so the live region can announce a stable label for
  // reasoning without sniffing the localized prefix out of `collapsedActivity`.
  const collapsedActivityIsReasoning = useAuiState((s) =>
    isCollapsedActivityReasoning(s.chainOfThought.parts),
  );

  const isChainStreaming = useAuiState((s) => {
    const chainStatusType = s.chainOfThought.status.type;
    if (isMessageStatusStreaming(chainStatusType)) return true;
    const messageStatusType = s.message.status?.type;
    // A terminal message can't be streaming — guard before trusting per-part
    // status, so a stale `running` part on a finished run can't pin the chain
    // open with a perpetual shimmer.
    if (!isMessageStatusStreaming(messageStatusType)) return false;

    const parts = s.chainOfThought.parts;
    if (parts.some((part) => isMessageStatusStreaming(part.status?.type))) {
      return true;
    }

    const lastPart = findLastReasoningOrToolPart(parts);
    if (!lastPart) return false;
    if (lastPart.type === "reasoning") return true;

    const lastPartStatusType = partStatusOrFallback(
      lastPart.status?.type,
      chainStatusType,
      messageStatusType,
    );
    const inferredStatusType = inferToolActivityStatusType(
      lastPart,
      lastPartStatusType,
      messageStatusType,
    );
    return isMessageStatusStreaming(inferredStatusType);
  });

  const hasRequiresAction = useAuiState((s) => {
    const chainStatusType = s.chainOfThought.status.type;
    if (chainStatusType === "requires-action") return true;
    const messageStatusType = s.message.status?.type;
    if (messageStatusType === "requires-action") return true;
    const parts = s.chainOfThought.parts;
    return parts.some((part) => part.status?.type === "requires-action");
  });

  const hasIncomplete = useAuiState((s) => {
    const chainStatusType = s.chainOfThought.status.type;
    if (chainStatusType === "incomplete") return true;
    const messageStatusType = s.message.status?.type;
    if (messageStatusType === "incomplete") return true;
    const parts = s.chainOfThought.parts;
    return parts.some((part) => part.status?.type === "incomplete");
  });

  const phase = derivePhase({
    partsLength,
    isStreaming: isChainStreaming,
    hasRequiresAction,
    hasIncomplete,
  });
  const isActivePhase = phase === "running" || phase === "requires-action";
  const elapsedSeconds = useElapsedSeconds(isActivePhase);
  const terminalElapsedSeconds =
    phase === "complete" || phase === "incomplete" ? elapsedSeconds : undefined;
  // Keep an auto-opened stream expanded after completion only when requested,
  // without mirroring the streaming prop through state.
  const holdOpenAfterStreamingRef = useRef(
    isChainStreaming && !autoCollapseOnComplete,
  );
  if (autoCollapseOnComplete) {
    holdOpenAfterStreamingRef.current = false;
  } else if (isChainStreaming) {
    holdOpenAfterStreamingRef.current = true;
  }
  const wasStreamingRef = useRef(isChainStreaming);

  useEffect(() => {
    if (
      !isChainStreaming &&
      wasStreamingRef.current &&
      autoCollapseOnComplete
    ) {
      // Auto-collapse unmounts the content. If the user had moved focus into
      // it (a tool-detail toggle, a Retry button), move focus to the trigger
      // first so it doesn't fall back to <body> and strand keyboard/AT users.
      const root = rootRef.current;
      const active = root?.ownerDocument.activeElement;
      if (root && active && active !== root.ownerDocument.body) {
        const content = root.querySelector<HTMLElement>(
          "[data-slot=chain-of-thought-content]",
        );
        if (content?.contains(active)) {
          root
            .querySelector<HTMLElement>("[data-slot=chain-of-thought-trigger]")
            ?.focus();
        }
      }
    }

    wasStreamingRef.current = isChainStreaming;
  }, [autoCollapseOnComplete, isChainStreaming]);

  const open =
    isChainStreaming || !collapsed || holdOpenAfterStreamingRef.current;

  // Single polite live region mirroring the visible (aria-hidden) activity, so
  // screen-reader users get passive feedback. Per-token reasoning updates are
  // collapsed to a stable "Thinking…" string so the value only changes on a
  // meaningful transition (new tool / done / stopped) instead of every tick.
  const liveStatus =
    phase === "complete"
      ? strings.done(terminalElapsedSeconds)
      : phase === "incomplete"
        ? strings.stopped(terminalElapsedSeconds)
        : isActivePhase
          ? collapsedActivity && !collapsedActivityIsReasoning
            ? collapsedActivity
            : strings.thinking
          : "";

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        holdOpenAfterStreamingRef.current = false;
      }
      aui.chainOfThought().setCollapsed(!nextOpen);
    },
    [aui],
  );

  return (
    <ChainOfThoughtStringsContext.Provider value={strings}>
      <div ref={rootRef} className="contents">
        <output
          aria-live="polite"
          aria-atomic
          data-slot="chain-of-thought-live-status"
          className="sr-only"
        >
          {liveStatus}
        </output>
        <ChainOfThoughtRoot
          open={open}
          onOpenChange={handleOpenChange}
          {...(variant ? { variant } : {})}
        >
          <ChainOfThoughtTrigger
            phase={phase}
            isOpen={open}
            reasoningLabel={strings.reasoning}
            streamingLabel={strings.thinking}
            {...(collapsedActivity ? { activityLabel: collapsedActivity } : {})}
            {...(elapsedSeconds !== undefined ? { elapsedSeconds } : {})}
            {...(renderTriggerContent ? { renderTriggerContent } : {})}
          />
          <ChainOfThoughtContent aria-busy={isChainStreaming}>
            <ChainOfThoughtRuntimeTimeline
              partsLength={partsLength}
              isChainStreaming={isChainStreaming}
              constrainHeight={constrainHeight}
              phase={phase}
              {...(terminalElapsedSeconds !== undefined
                ? { terminalElapsedSeconds }
                : {})}
              {...(toolActivityLabels !== undefined
                ? { toolActivityLabels }
                : {})}
            />
          </ChainOfThoughtContent>
        </ChainOfThoughtRoot>
      </div>
    </ChainOfThoughtStringsContext.Provider>
  );
};
