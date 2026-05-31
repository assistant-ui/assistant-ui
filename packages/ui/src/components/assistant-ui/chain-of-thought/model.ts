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

export const derivePhase = ({
  partsLength,
  isStreaming,
  hasRequiresAction,
  hasIncomplete,
}: {
  partsLength: number;
  isStreaming: boolean;
  hasRequiresAction: boolean;
  hasIncomplete: boolean;
}): ChainOfThoughtPhase => {
  if (partsLength === 0) return "idle";
  if (hasRequiresAction) return "requires-action";
  if (isStreaming) return "running";
  if (hasIncomplete) return "incomplete";
  return "complete";
};

export type StepType = keyof typeof stepTypeIcons;

export type StepStatus = "pending" | "active" | "complete" | "error";

export type TraceStatus = "pending" | "running" | "complete" | "incomplete";

export type TraceOutputStatus = "streaming" | "complete";

export type TraceStepOutput =
  | ReactNode
  | {
      content: ReactNode;
      status?: TraceOutputStatus | undefined;
    };

export type TraceStep = {
  kind: "step";
  id: string;
  label?: ReactNode | undefined;
  stepLabel?: string | number | undefined;
  type?: StepType | undefined;
  icon?: LucideIcon | ReactNode | undefined;
  status?: TraceStatus | undefined;
  toolName?: string | undefined;
  detail?: ReactNode | undefined;
  output?: TraceStepOutput | undefined;
  meta?: Record<string, unknown> | undefined;
};

export type TraceGroup = {
  kind: "group";
  id: string;
  label: string;
  status?: TraceStatus | undefined;
  summary?:
    | {
        latestLabel?: ReactNode | undefined;
        latestType?: StepType | undefined;
        toolName?: string | undefined;
      }
    | undefined;
  children: TraceNode[];
  variant?: "subagent" | "default" | undefined;
  meta?: Record<string, unknown> | undefined;
};

export type TraceNode = TraceStep | TraceGroup;

export type TraceSummaryStats = {
  totalSteps: number;
  searchSteps: number;
  toolSteps: number;
};

export type TraceSummaryFormatter = (
  stats: TraceSummaryStats & {
    durationSec?: number | undefined;
  },
) => string;

const enPluralRules = new Intl.PluralRules("en-US");

export const pluralize = (
  count: number,
  singular: string,
  plural = `${singular}s`,
  rules: Intl.PluralRules = enPluralRules,
): string => (rules.select(count) === "one" ? singular : plural);

export const summarizeTraceStats = (
  stats: TraceSummaryStats,
  durationSec?: number,
  phase: ChainOfThoughtPhase = "complete",
) => {
  const stepCount = `${stats.totalSteps} ${pluralize(stats.totalSteps, "step")}`;
  const baseLabel =
    phase === "incomplete"
      ? `Stopped after ${stepCount}`
      : stats.searchSteps > 0
        ? `Researched ${stats.searchSteps} ${pluralize(stats.searchSteps, "source")}`
        : stats.toolSteps > 0
          ? `Ran ${stats.toolSteps} ${pluralize(stats.toolSteps, "tool")}`
          : `Completed ${stepCount}`;
  // `!= null` (not truthiness) so a legitimate 0s duration still renders.
  return durationSec != null ? `${baseLabel} (${durationSec}s)` : baseLabel;
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

export const traceHasIncomplete = (nodes: TraceNode[]): boolean => {
  for (const node of nodes) {
    if (node.kind === "step") {
      if (node.status === "incomplete") return true;
      continue;
    }
    if (node.status === "incomplete") return true;
    if (traceHasIncomplete(node.children)) return true;
  }
  return false;
};
