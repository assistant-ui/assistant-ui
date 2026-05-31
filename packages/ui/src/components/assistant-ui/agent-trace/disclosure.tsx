"use client";

import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import {
  ChainOfThoughtContent,
  ChainOfThoughtRoot,
  ChainOfThoughtTrigger,
} from "../chain-of-thought/disclosure";
import type { ChainOfThoughtPhase } from "../chain-of-thought/model";
import {
  agentTraceHasIncomplete,
  agentTraceHasRunning,
  collectAgentTraceStats,
  summarizeAgentTraceStats,
  type AgentTraceSummaryStats,
} from "./model";
import { AgentTraceNodes } from "./nodes";
import type { AgentTraceDisclosureProps } from "./shared";
import { useElapsedSeconds, useTraceDuration } from "./time";

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

function AgentTraceDisclosureRoot({
  isStreaming,
  hasIncomplete,
  stats,
  label,
  summary,
  autoCollapseOnComplete = true,
  children,
}: Pick<
  AgentTraceDisclosureProps,
  "label" | "summary" | "autoCollapseOnComplete"
> & {
  isStreaming: boolean;
  hasIncomplete: boolean;
  stats: AgentTraceSummaryStats;
  children: ReactNode;
}) {
  const durationSec = useTraceDuration(isStreaming);
  const phase: Extract<
    ChainOfThoughtPhase,
    "running" | "complete" | "incomplete"
  > = isStreaming ? "running" : hasIncomplete ? "incomplete" : "complete";
  const summaryLabel = useMemo(() => {
    if (typeof summary === "string") return summary;
    if (typeof summary === "function") {
      return summary({
        ...stats,
        incomplete: phase === "incomplete",
        ...(durationSec != null ? { durationSec } : {}),
      });
    }
    return summarizeAgentTraceStats(stats, durationSec, phase);
  }, [durationSec, phase, stats, summary]);
  const elapsedSeconds = useElapsedSeconds(isStreaming);

  const { open, handleOpenChange } = useTraceDisclosureState({
    isStreaming,
    autoCollapseOnComplete,
  });

  return (
    <ChainOfThoughtRoot open={open} onOpenChange={handleOpenChange}>
      <ChainOfThoughtTrigger
        phase={phase}
        isOpen={open}
        reasoningLabel={label ?? "Trace"}
        activityLabel={isStreaming ? "Working..." : summaryLabel}
        {...(elapsedSeconds !== undefined ? { elapsedSeconds } : {})}
      />
      <ChainOfThoughtContent aria-busy={isStreaming}>
        {children}
      </ChainOfThoughtContent>
    </ChainOfThoughtRoot>
  );
}

export function AgentTraceDisclosure({
  trace,
  allowGroupExpand: requestedAllowGroupExpand = true,
  label,
  summary,
  autoCollapseOnComplete,
  ...timelineProps
}: AgentTraceDisclosureProps) {
  const isStreaming = useMemo(() => agentTraceHasRunning(trace), [trace]);
  const hasIncomplete = useMemo(() => agentTraceHasIncomplete(trace), [trace]);
  const stats = useMemo(() => collectAgentTraceStats(trace), [trace]);
  const allowGroupExpand = requestedAllowGroupExpand && !isStreaming;

  return (
    <AgentTraceDisclosureRoot
      isStreaming={isStreaming}
      hasIncomplete={hasIncomplete}
      stats={stats}
      label={label}
      summary={summary}
      autoCollapseOnComplete={autoCollapseOnComplete}
    >
      <AgentTraceNodes
        {...timelineProps}
        trace={trace}
        allowGroupExpand={allowGroupExpand}
      />
    </AgentTraceDisclosureRoot>
  );
}
