import type { ReactNode } from "react";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  FileTextIcon,
  GitMergeIcon,
  GlobeIcon,
  ImageIcon,
  SearchIcon,
  TerminalIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

/**
 * Map of step types to their default icons.
 * Extend this record to add custom step types.
 * Note: "default" is handled specially with a small bullet dot.
 */
export const stepTypeIcons = {
  search: SearchIcon,
  web_search: GlobeIcon,
  image: ImageIcon,
  text: FileTextIcon,
  code: TerminalIcon,
  javascript: TerminalIcon,
  merge: GitMergeIcon,
  write: FileTextIcon,
  tool: WrenchIcon,
  complete: CheckCircleIcon,
  error: AlertCircleIcon,
  default: null,
} as const satisfies Record<string, LucideIcon | null>;

export type ChainOfThoughtPhase =
  | "idle"
  | "running"
  | "requires-action"
  | "complete"
  | "incomplete";

export type StepType = keyof typeof stepTypeIcons;
export type StepStatus = "pending" | "active" | "complete" | "error";

export type TraceStatus = "running" | "complete" | "incomplete" | "error";

export type TraceOutputStatus = "streaming" | "complete";

export type TraceStepOutput =
  | ReactNode
  | {
      content: ReactNode;
      status?: TraceOutputStatus;
    };

export type TraceStep = {
  kind: "step";
  id: string;
  label?: ReactNode;
  type?: StepType;
  status?: TraceStatus;
  toolName?: string;
  detail?: ReactNode;
  output?: TraceStepOutput;
  meta?: Record<string, unknown>;
};

export type TraceGroup = {
  kind: "group";
  id: string;
  label: string;
  status?: TraceStatus;
  summary?: {
    latestLabel?: ReactNode;
    latestType?: StepType;
    toolName?: string;
  };
  children: TraceNode[];
  variant?: "subagent" | "default";
  meta?: Record<string, unknown>;
};

export type TraceNode = TraceStep | TraceGroup;

export type TraceSummaryStats = {
  totalSteps: number;
  searchSteps: number;
  toolSteps: number;
};

export type TraceSummaryFormatter = (
  stats: TraceSummaryStats & {
    durationSec?: number;
  },
) => string;

export const summarizeTraceStats = (
  stats: TraceSummaryStats,
  durationSec?: number,
) => {
  const baseLabel =
    stats.searchSteps > 0
      ? `Researched ${stats.searchSteps} source${stats.searchSteps === 1 ? "" : "s"}`
      : stats.toolSteps > 0
        ? `Ran ${stats.toolSteps} tool${stats.toolSteps === 1 ? "" : "s"}`
        : `Completed ${stats.totalSteps} step${stats.totalSteps === 1 ? "" : "s"}`;
  return durationSec ? `${baseLabel} (${durationSec}s)` : baseLabel;
};

export const collectTraceStats = (nodes: TraceNode[]): TraceSummaryStats => {
  let totalSteps = 0;
  let searchSteps = 0;
  let toolSteps = 0;

  const visit = (node: TraceNode) => {
    if (node.kind === "step") {
      totalSteps += 1;
      const toolName = node.toolName ?? "";
      const isSearch =
        node.type === "search" || toolName.toLowerCase().includes("search");
      const isTool = node.type === "tool" || toolName.length > 0;
      if (isSearch) searchSteps += 1;
      if (isTool) toolSteps += 1;
      return;
    }

    node.children.forEach(visit);
  };

  nodes.forEach(visit);
  return { totalSteps, searchSteps, toolSteps };
};

export const traceHasRunning = (nodes: TraceNode[]): boolean => {
  for (const node of nodes) {
    if (node.kind === "step") {
      if (node.status === "running") return true;
      continue;
    }
    if (node.status === "running") return true;
    if (traceHasRunning(node.children)) return true;
  }
  return false;
};
