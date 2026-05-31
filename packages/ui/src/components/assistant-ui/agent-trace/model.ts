import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { ChainOfThoughtPhase, StepType } from "../chain-of-thought/model";

export type AgentTraceStatus =
  | "pending"
  | "running"
  | "complete"
  | "incomplete";

export type AgentTraceStepOutput =
  | ReactNode
  | {
      content: ReactNode;
      status?: "streaming" | "complete" | undefined;
    };

export type AgentTraceStep = {
  kind: "step";
  id: string;
  label?: ReactNode | undefined;
  stepLabel?: string | number | undefined;
  type?: StepType | undefined;
  icon?: LucideIcon | ReactNode | undefined;
  status?: AgentTraceStatus | undefined;
  toolName?: string | undefined;
  detail?: ReactNode | undefined;
  output?: AgentTraceStepOutput | undefined;
};

export type AgentTraceGroup = {
  kind: "group";
  id: string;
  label: string;
  status?: AgentTraceStatus | undefined;
  summary?:
    | {
        latestLabel?: ReactNode | undefined;
        toolName?: string | undefined;
      }
    | undefined;
  children: AgentTraceNode[];
};

export type AgentTraceNode = AgentTraceStep | AgentTraceGroup;

export type AgentTraceSummaryStats = {
  totalSteps: number;
  searchSteps: number;
  toolSteps: number;
};

export type AgentTraceSummaryFormatter = (
  stats: AgentTraceSummaryStats & {
    durationSec?: number | undefined;
    incomplete: boolean;
  },
) => string;

const enPluralRules = new Intl.PluralRules("en-US");

export const pluralize = (
  count: number,
  singular: string,
  plural = `${singular}s`,
  rules: Intl.PluralRules = enPluralRules,
): string => (rules.select(count) === "one" ? singular : plural);

export const summarizeAgentTraceStats = (
  stats: AgentTraceSummaryStats,
  durationSec?: number,
  phase: Extract<
    ChainOfThoughtPhase,
    "running" | "complete" | "incomplete"
  > = "complete",
) => {
  const stepCount = `${stats.totalSteps} ${pluralize(stats.totalSteps, "step")}`;
  const baseLabel =
    phase === "running"
      ? "Working..."
      : phase === "incomplete"
        ? `Stopped after ${stepCount}`
        : stats.searchSteps > 0
          ? `Researched ${stats.searchSteps} ${pluralize(stats.searchSteps, "source")}`
          : stats.toolSteps > 0
            ? `Ran ${stats.toolSteps} ${pluralize(stats.toolSteps, "tool")}`
            : `Completed ${stepCount}`;

  return durationSec != null && phase !== "running"
    ? `${baseLabel} (${durationSec}s)`
    : baseLabel;
};

export const collectAgentTraceStats = (
  nodes: AgentTraceNode[],
): AgentTraceSummaryStats => {
  let totalSteps = 0;
  let searchSteps = 0;
  let toolSteps = 0;

  const visit = (node: AgentTraceNode) => {
    if (node.kind === "step") {
      totalSteps += 1;
      const toolName = node.toolName ?? "";
      const isSearch =
        node.type === "search" || toolName.toLowerCase().includes("search");
      const isTool = node.type === "tool" || toolName.length > 0;
      if (isSearch) {
        searchSteps += 1;
      } else if (isTool) {
        toolSteps += 1;
      }
      return;
    }

    node.children.forEach(visit);
  };

  nodes.forEach(visit);
  return { totalSteps, searchSteps, toolSteps };
};

export const agentTraceHasRunning = (nodes: AgentTraceNode[]): boolean => {
  for (const node of nodes) {
    if (node.kind === "step") {
      if (node.status === "running") return true;
      continue;
    }
    if (node.status === "running") return true;
    if (agentTraceHasRunning(node.children)) return true;
  }
  return false;
};

export const agentTraceHasIncomplete = (nodes: AgentTraceNode[]): boolean => {
  for (const node of nodes) {
    if (node.kind === "step") {
      if (node.status === "incomplete") return true;
      continue;
    }
    if (node.status === "incomplete") return true;
    if (agentTraceHasIncomplete(node.children)) return true;
  }
  return false;
};
