"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuiState } from "@assistant-ui/react";
import {
  ChainOfThoughtContent,
  ChainOfThoughtRoot,
  ChainOfThoughtTrigger,
} from "./disclosure";
import {
  collectTraceStats,
  summarizeTraceStats,
  traceHasRunning,
  type ChainOfThoughtPhase,
  type TraceSummaryStats,
} from "./model";
import { ChainOfThoughtTraceNodes } from "./trace-nodes";
import { ChainOfThoughtTraceParts } from "./trace-parts";
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
  const [open, setOpen] = useState(isStreaming);
  const wasStreamingRef = useRef(isStreaming);

  useEffect(() => {
    if (isStreaming) {
      setOpen(true);
    } else if (wasStreamingRef.current && autoCollapseOnComplete) {
      setOpen(false);
    }

    wasStreamingRef.current = isStreaming;
  }, [autoCollapseOnComplete, isStreaming]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (isStreaming) return;
      setOpen(nextOpen);
    },
    [isStreaming],
  );

  return { open, handleOpenChange };
}

function ChainOfThoughtTraceDisclosureRoot({
  isStreaming,
  stats,
  label = "Working...",
  summary,
  autoCollapseOnComplete = true,
  rootProps,
  triggerProps,
  contentProps,
  children,
}: ChainOfThoughtTraceDisclosureSharedProps & {
  isStreaming: boolean;
  stats: TraceSummaryStats;
  children: ReactNode;
}) {
  const durationSec = useTraceDuration(isStreaming);
  const summaryLabel = useMemo(() => {
    if (typeof summary === "string") return summary;
    if (typeof summary === "function") {
      return summary({
        ...stats,
        ...(durationSec != null ? { durationSec } : {}),
      });
    }
    return summarizeTraceStats(stats, durationSec);
  }, [durationSec, stats, summary]);
  const phase: ChainOfThoughtPhase = isStreaming ? "running" : "complete";
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
        reasoningLabel={isStreaming ? label : summaryLabel}
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
  label,
  summary,
  autoCollapseOnComplete,
  rootProps,
  triggerProps,
  contentProps,
  ...timelineProps
}: ChainOfThoughtTraceNodesProps & ChainOfThoughtTraceDisclosureSharedProps) {
  const isStreaming = useMemo(() => traceHasRunning(trace), [trace]);
  const stats = useMemo(() => collectTraceStats(trace), [trace]);
  const allowGroupExpand = !disableGroupExpansionWhileStreaming || !isStreaming;

  return (
    <ChainOfThoughtTraceDisclosureRoot
      isStreaming={isStreaming}
      stats={stats}
      label={label}
      summary={summary}
      autoCollapseOnComplete={autoCollapseOnComplete}
      rootProps={rootProps}
      triggerProps={triggerProps}
      contentProps={contentProps}
    >
      <ChainOfThoughtTraceNodes
        trace={trace}
        allowGroupExpand={allowGroupExpand}
        {...timelineProps}
      />
    </ChainOfThoughtTraceDisclosureRoot>
  );
}

function ChainOfThoughtTraceDisclosureParts({
  label,
  summary,
  autoCollapseOnComplete,
  disableGroupExpansionWhileStreaming = true,
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

  return (
    <ChainOfThoughtTraceDisclosureRoot
      isStreaming={isStreaming}
      stats={stats}
      label={label}
      summary={summary}
      autoCollapseOnComplete={autoCollapseOnComplete}
      rootProps={rootProps}
      triggerProps={triggerProps}
      contentProps={contentProps}
    >
      <ChainOfThoughtTraceParts
        groupingFunction={groupingFunction}
        inferStep={inferStep}
        {...timelineProps}
      />
    </ChainOfThoughtTraceDisclosureRoot>
  );
}

export function ChainOfThoughtTraceDisclosure(
  props: ChainOfThoughtTraceDisclosureProps,
) {
  if ("trace" in props && props.trace !== undefined) {
    return <ChainOfThoughtTraceDisclosureNodes {...props} />;
  }
  return <ChainOfThoughtTraceDisclosureParts {...props} />;
}
