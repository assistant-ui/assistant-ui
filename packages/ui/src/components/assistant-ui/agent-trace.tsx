"use client";

import { AgentTraceDisclosure } from "./agent-trace/disclosure";
import { AgentTraceNodes } from "./agent-trace/nodes";
import type { AgentTraceProps } from "./agent-trace/shared";

function AgentTrace({
  trace,
  nodeComponents,
  maxDepth = 2,
  ...timelineProps
}: AgentTraceProps) {
  return (
    <AgentTraceNodes
      trace={trace}
      {...(nodeComponents != null ? { nodeComponents } : {})}
      maxDepth={maxDepth}
      {...timelineProps}
    />
  );
}

export { AgentTrace, AgentTraceDisclosure };

export type {
  AgentTraceGroup,
  AgentTraceNode,
  AgentTraceStatus,
  AgentTraceStep,
  AgentTraceSummaryFormatter,
  AgentTraceSummaryStats,
} from "./agent-trace/model";
export type {
  AgentTraceDisclosureProps,
  AgentTraceGroupSummaryProps,
  AgentTraceNodeComponents,
  AgentTraceProps,
} from "./agent-trace/shared";
