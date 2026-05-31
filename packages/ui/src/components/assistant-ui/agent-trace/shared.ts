import type { ComponentProps, ComponentType, ReactNode } from "react";
import type { ChainOfThoughtTimeline } from "../chain-of-thought/layout";
import type { StepStatus } from "../chain-of-thought/model";
import type {
  AgentTraceGroup,
  AgentTraceNode,
  AgentTraceStatus,
  AgentTraceStep,
  AgentTraceSummaryFormatter,
} from "./model";

export const isAgentTraceGroup = (
  node: AgentTraceNode,
): node is AgentTraceGroup => node.kind === "group";

const isAgentTraceStep = (node: AgentTraceNode): node is AgentTraceStep =>
  node.kind === "step";

export const mapAgentTraceStatusToStepStatus = (
  status?: AgentTraceStatus,
): StepStatus => {
  switch (status) {
    case "pending":
      return "pending";
    case "running":
      return "active";
    case "incomplete":
      return "error";
    default:
      return "complete";
  }
};

export const mapAgentTraceStatusToToolBadge = (
  status?: AgentTraceStatus,
): "pending" | "running" | "complete" | "error" => {
  switch (status) {
    case "pending":
      return "pending";
    case "running":
      return "running";
    case "incomplete":
      return "error";
    default:
      return "complete";
  }
};

export const getLatestAgentTraceStep = (
  node: AgentTraceNode,
): AgentTraceStep | undefined => {
  if (isAgentTraceStep(node)) return node;
  for (let i = node.children.length - 1; i >= 0; i--) {
    const child = node.children[i]!;
    const latest = getLatestAgentTraceStep(child);
    if (latest) return latest;
  }
  return undefined;
};

export const getAgentTraceStepLabel = (
  step: AgentTraceStep,
): ReactNode | undefined => {
  if (step.label !== undefined) return step.label;
  if (step.toolName) return `Tool: ${step.toolName}`;
  return undefined;
};

export type AgentTraceGroupSummaryProps = {
  group: AgentTraceGroup;
  latestStep?: AgentTraceStep | undefined;
  isOpen: boolean;
  canExpand: boolean;
  onToggle: () => void;
  depth?: number | undefined;
};

export type AgentTraceNodeComponents = {
  GroupSummary?: ComponentType<AgentTraceGroupSummaryProps> | undefined;
  StepBody?: ComponentType<{ step: AgentTraceStep }> | undefined;
};

export type AgentTraceProps = Omit<
  ComponentProps<typeof ChainOfThoughtTimeline>,
  "children"
> & {
  trace: AgentTraceNode[];
  maxDepth?: number | undefined;
  nodeComponents?: AgentTraceNodeComponents | undefined;
  constrainHeight?: boolean | undefined;
  allowGroupExpand?: boolean | undefined;
};

export type AgentTraceDisclosureProps = AgentTraceProps & {
  label?: string | undefined;
  summary?: string | AgentTraceSummaryFormatter | undefined;
  autoCollapseOnComplete?: boolean | undefined;
};
