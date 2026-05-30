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

/** High-level state used by the root trigger and streaming disclosure logic. */
export type ChainOfThoughtPhase =
  | "idle"
  | "running"
  | "requires-action"
  | "complete"
  | "incomplete";

/**
 * Combines per-phase predicates into the single phase enum used by the trigger.
 * Order matters: `idle` wins when there are no parts, then we surface the most
 * actionable state — `requires-action` > `running` > `incomplete` > `complete`.
 */
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

/** Built-in visual categories for timeline step icons. */
export type StepType = keyof typeof stepTypeIcons;

/** Status values supported by an individual visual timeline step. */
export type StepStatus = "pending" | "active" | "complete" | "error";

/** Status values accepted by structured trace nodes. */
export type TraceStatus = "pending" | "running" | "complete" | "incomplete";

/** Status values for trace output content. */
export type TraceOutputStatus = "streaming" | "complete";

/** Body content for a trace step, optionally annotated with stream state. */
export type TraceStepOutput =
  | ReactNode
  | {
      content: ReactNode;
      status?: TraceOutputStatus | undefined;
    };

/** A leaf item in a structured chain-of-thought trace. */
export type TraceStep = {
  /** Discriminator for leaf trace steps. */
  kind: "step";
  /** Stable key for React rendering and trace updates. */
  id: string;
  /** Optional visible label above the step body. */
  label?: ReactNode | undefined;
  /** Compact label rendered inside the step indicator. */
  stepLabel?: string | number | undefined;
  /** Icon/category hint for the step indicator. */
  type?: StepType | undefined;
  /** Custom icon rendered inside the step indicator. */
  icon?: LucideIcon | ReactNode | undefined;
  /** Runtime state mapped to the visual step status. */
  status?: TraceStatus | undefined;
  /** Tool name shown in the compact tool badge. */
  toolName?: string | undefined;
  /** Secondary detail rendered below the main output. */
  detail?: ReactNode | undefined;
  /** Primary step output content. */
  output?: TraceStepOutput | undefined;
  /** Caller-owned metadata for custom renderers. */
  meta?: Record<string, unknown> | undefined;
};

/** A nested group of trace nodes, such as a subagent or multi-tool phase. */
export type TraceGroup = {
  /** Discriminator for nested trace groups. */
  kind: "group";
  /** Stable key for React rendering and trace updates. */
  id: string;
  /** Visible group label. */
  label: string;
  /** Runtime state for the group summary and indicator. */
  status?: TraceStatus | undefined;
  /** Optional compact summary shown while the group is collapsed. */
  summary?:
    | {
        latestLabel?: ReactNode | undefined;
        latestType?: StepType | undefined;
        toolName?: string | undefined;
      }
    | undefined;
  /** Child trace nodes rendered when the group is expanded. */
  children: TraceNode[];
  /** Visual treatment for special group kinds, such as subagents. */
  variant?: "subagent" | "default" | undefined;
  /** Caller-owned metadata for custom renderers. */
  meta?: Record<string, unknown> | undefined;
};

/** Any node accepted by the structured trace renderer. */
export type TraceNode = TraceStep | TraceGroup;

/** Aggregate counts used to summarize a trace in the collapsed trigger. */
export type TraceSummaryStats = {
  totalSteps: number;
  searchSteps: number;
  toolSteps: number;
};

/** Custom formatter for the collapsed trace summary label. */
export type TraceSummaryFormatter = (
  stats: TraceSummaryStats & {
    durationSec?: number | undefined;
  },
) => string;

// Default English plural rules. Non-English locales should localize counts by
// overriding the `traceSummary` string seam with their own `Intl.PluralRules`;
// this keeps the in-repo default correct (one/other) without hardcoding `+s`.
const enPluralRules = new Intl.PluralRules("en-US");

/**
 * Picks the singular or plural form for a count via `Intl.PluralRules`, so
 * counts read correctly across locales instead of a hardcoded `+s`. English
 * only distinguishes `one`/`other`; pass a locale-specific `Intl.PluralRules`
 * (and forms) to localize.
 */
export const pluralize = (
  count: number,
  singular: string,
  plural = `${singular}s`,
  rules: Intl.PluralRules = enPluralRules,
): string => (rules.select(count) === "one" ? singular : plural);

/** Builds the default collapsed summary from trace counts and duration. */
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

/**
 * Counts total, search, and tool steps in a structured trace tree.
 *
 * `searchSteps` and `toolSteps` are disjoint: a search counts only toward
 * `searchSteps`, so `toolSteps` is "non-search tool calls". This keeps custom
 * {@link TraceSummaryFormatter}s honest (a single `search_web` call reads as
 * "1 search, 0 tools", not "1 search, 1 tool"). Group nodes are not counted.
 */
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

/** Returns true when any trace node is actively running. */
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

/** Returns true when any trace node ended incompletely. */
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
