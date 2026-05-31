"use client";

import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { useAuiState } from "@assistant-ui/react";
import {
  ChainOfThoughtContent,
  ChainOfThoughtRoot,
  ChainOfThoughtTrigger,
} from "./disclosure";
import {
  collectTraceStats,
  traceHasIncomplete,
  traceHasRunning,
  type ChainOfThoughtPhase,
  type TraceSummaryStats,
} from "./model";
import { ChainOfThoughtTraceNodes } from "./trace-nodes";
import { useChainOfThoughtStrings } from "./strings";
import {
  defaultInferStep,
  groupMessagePartsByParentId,
  traceFromMessageParts,
  type ChainOfThoughtTraceDisclosureProps,
  type ChainOfThoughtTraceDisclosureSharedProps,
  type ChainOfThoughtTraceNodesProps,
  type ChainOfThoughtTracePartsProps,
} from "./trace-shared";
import { useElapsedSeconds, useTraceDuration } from "./trace-time";

function useTraceDisclosureState({
  isStreaming,
  autoCollapseOnComplete,
}: {
  isStreaming: boolean;
  autoCollapseOnComplete: boolean;
}) {
  const [userOpen, setUserOpen] = useState(false);
  const holdOpenAfterStreamingRef = useRef(
    isStreaming && !autoCollapseOnComplete,
  );
  if (autoCollapseOnComplete) {
    holdOpenAfterStreamingRef.current = false;
  } else if (isStreaming) {
    holdOpenAfterStreamingRef.current = true;
  }
  const open = isStreaming || userOpen || holdOpenAfterStreamingRef.current;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (isStreaming) return;
      if (!nextOpen) {
        holdOpenAfterStreamingRef.current = false;
      }
      setUserOpen(nextOpen);
    },
    [isStreaming],
  );

  return { open, handleOpenChange };
}

/** Shared root shell used by both static traces and message-derived traces. */
function ChainOfThoughtTraceDisclosureRoot({
  isStreaming,
  hasIncomplete,
  stats,
  label,
  summary,
  autoCollapseOnComplete = true,
  rootProps,
  triggerProps,
  contentProps,
  children,
}: ChainOfThoughtTraceDisclosureSharedProps & {
  isStreaming: boolean;
  hasIncomplete: boolean;
  stats: TraceSummaryStats;
  children: ReactNode;
}) {
  const strings = useChainOfThoughtStrings();
  const durationSec = useTraceDuration(isStreaming);
  const phase: ChainOfThoughtPhase = isStreaming
    ? "running"
    : hasIncomplete
      ? "incomplete"
      : "complete";
  const summaryLabel = useMemo(() => {
    if (typeof summary === "string") return summary;
    if (typeof summary === "function") {
      return summary({
        ...stats,
        ...(durationSec != null ? { durationSec } : {}),
      });
    }
    return strings.traceSummary({
      ...stats,
      incomplete: phase === "incomplete",
      ...(durationSec != null ? { durationSec } : {}),
    });
  }, [durationSec, phase, stats, summary, strings]);
  const resolvedLabel = label ?? strings.working;
  const elapsedSeconds = useElapsedSeconds(isStreaming);

  const { open, handleOpenChange } = useTraceDisclosureState({
    isStreaming,
    autoCollapseOnComplete,
  });

  return (
    <ChainOfThoughtRoot
      open={open}
      onOpenChange={handleOpenChange}
      {...rootProps}
    >
      <ChainOfThoughtTrigger
        phase={phase}
        isOpen={open}
        reasoningLabel={strings.reasoning}
        activityLabel={isStreaming ? resolvedLabel : summaryLabel}
        {...(elapsedSeconds !== undefined ? { elapsedSeconds } : {})}
        {...triggerProps}
      />
      <ChainOfThoughtContent aria-busy={isStreaming} {...contentProps}>
        {children}
      </ChainOfThoughtContent>
    </ChainOfThoughtRoot>
  );
}

function ChainOfThoughtTraceDisclosureNodes({
  trace,
  disableGroupExpansionWhileStreaming = true,
  allowGroupExpand: requestedAllowGroupExpand = true,
  label,
  summary,
  autoCollapseOnComplete,
  rootProps,
  triggerProps,
  contentProps,
  ...timelineProps
}: ChainOfThoughtTraceNodesProps & ChainOfThoughtTraceDisclosureSharedProps) {
  const isStreaming = useMemo(() => traceHasRunning(trace), [trace]);
  const hasIncomplete = useMemo(() => traceHasIncomplete(trace), [trace]);
  const stats = useMemo(() => collectTraceStats(trace), [trace]);
  const allowGroupExpand =
    requestedAllowGroupExpand &&
    (!disableGroupExpansionWhileStreaming || !isStreaming);

  return (
    <ChainOfThoughtTraceDisclosureRoot
      isStreaming={isStreaming}
      hasIncomplete={hasIncomplete}
      stats={stats}
      label={label}
      summary={summary}
      autoCollapseOnComplete={autoCollapseOnComplete}
      rootProps={rootProps}
      triggerProps={triggerProps}
      contentProps={contentProps}
    >
      <ChainOfThoughtTraceNodes
        {...timelineProps}
        trace={trace}
        allowGroupExpand={allowGroupExpand}
      />
    </ChainOfThoughtTraceDisclosureRoot>
  );
}

function ChainOfThoughtTraceDisclosureParts({
  label,
  summary,
  autoCollapseOnComplete,
  disableGroupExpansionWhileStreaming = true,
  allowGroupExpand: requestedAllowGroupExpand = true,
  rootProps,
  triggerProps,
  contentProps,
  groupingFunction = groupMessagePartsByParentId,
  inferStep = defaultInferStep,
  ...timelineProps
}: ChainOfThoughtTracePartsProps & ChainOfThoughtTraceDisclosureSharedProps) {
  const isStreaming = useAuiState(({ message }) => {
    const type = message.status?.type;
    return type === "running" || type === "requires-action";
  });
  const messageParts = useAuiState(({ message }) => message.parts);
  const allowGroupExpand =
    requestedAllowGroupExpand &&
    (!disableGroupExpansionWhileStreaming || !isStreaming);

  // Derive the trace ONCE and reuse it for both the summary stats and the
  // rendered nodes, instead of recomputing `traceFromMessageParts` twice
  // (here for stats + again inside `ChainOfThoughtTraceParts`) every render.
  const trace = useMemo(
    () =>
      messageParts.length === 0
        ? []
        : traceFromMessageParts(messageParts, { groupingFunction, inferStep }),
    [groupingFunction, inferStep, messageParts],
  );
  const traceSummary = useMemo(
    () => ({
      stats: collectTraceStats(trace),
      hasIncomplete: traceHasIncomplete(trace),
    }),
    [trace],
  );

  return (
    <ChainOfThoughtTraceDisclosureRoot
      isStreaming={isStreaming}
      hasIncomplete={traceSummary.hasIncomplete}
      stats={traceSummary.stats}
      label={label}
      summary={summary}
      autoCollapseOnComplete={autoCollapseOnComplete}
      rootProps={rootProps}
      triggerProps={triggerProps}
      contentProps={contentProps}
    >
      <ChainOfThoughtTraceNodes
        {...timelineProps}
        trace={trace}
        allowGroupExpand={allowGroupExpand}
      />
    </ChainOfThoughtTraceDisclosureRoot>
  );
}

/** Renders a trace inside the ChainOfThought collapsible shell. */
export function ChainOfThoughtTraceDisclosure(
  props: ChainOfThoughtTraceDisclosureProps,
) {
  if ("trace" in props && props.trace !== undefined) {
    return <ChainOfThoughtTraceDisclosureNodes {...props} />;
  }
  return <ChainOfThoughtTraceDisclosureParts {...props} />;
}
