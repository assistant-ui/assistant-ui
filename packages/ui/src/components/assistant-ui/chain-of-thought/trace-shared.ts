import type { ComponentProps, ComponentType, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type {
  MessagePrimitive,
  ThreadAssistantMessagePart,
  ThreadUserMessagePart,
} from "@assistant-ui/react";
import type {
  ChainOfThoughtContent,
  ChainOfThoughtRootProps,
  ChainOfThoughtTriggerProps,
} from "./disclosure";
import type { ChainOfThoughtTimeline } from "./layout";
import type {
  StepStatus,
  StepType,
  TraceGroup,
  TraceNode,
  TraceStatus,
  TraceStep,
  TraceSummaryFormatter,
} from "./model";

/** Grouping function used to derive trace steps from message parts. */
export type PartsGroupedGroupingFunction = ComponentProps<
  typeof MessagePrimitive.Unstable_PartsGrouped
>["groupingFunction"];

type MessagePartGroup = ReturnType<PartsGroupedGroupingFunction>[number];
type GroupingParts = Parameters<PartsGroupedGroupingFunction>[0];
type GroupingPart = GroupingParts[number];
type TraceMessagePart = ThreadAssistantMessagePart | ThreadUserMessagePart;

import { inferStepTypeFromTool, isRecord } from "./runtime-activity";

const getParentId = (part: GroupingPart): string | undefined => {
  if (!isRecord(part)) return undefined;
  const parentId = part.parentId;
  return typeof parentId === "string" ? parentId : undefined;
};

/** Groups message parts by `parentId` while preserving first-seen order. */
export const groupMessagePartsByParentId: PartsGroupedGroupingFunction = (
  parts,
) => {
  const messageParts = parts as readonly TraceMessagePart[];

  // Map maintains insertion order, so groups appear in order of first occurrence
  const groupMap = new Map<string, number[]>();

  for (let i = 0; i < messageParts.length; i++) {
    const parentId = getParentId(messageParts[i]);
    const groupId = parentId ?? `__ungrouped_${i}`;
    const indices = groupMap.get(groupId) ?? [];
    indices.push(i);
    groupMap.set(groupId, indices);
  }

  const groups: MessagePartGroup[] = [];
  for (const [groupId, indices] of groupMap) {
    const groupKey = groupId.startsWith("__ungrouped_") ? undefined : groupId;
    groups.push({ groupKey, indices });
  }

  return groups;
};

/** Returns true for structured trace group nodes. */
export const isTraceGroup = (node: TraceNode): node is TraceGroup =>
  node.kind === "group";

const isTraceStep = (node: TraceNode): node is TraceStep =>
  node.kind === "step";

/** Maps structured trace status values onto visual step states. */
export const mapTraceStatusToStepStatus = (
  status?: TraceStatus,
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

const stepStatusToTrace = (s: StepStatus): TraceStatus =>
  s === "active"
    ? "running"
    : s === "pending"
      ? "pending"
      : s === "error"
        ? "incomplete"
        : "complete";

/** Maps structured trace status values onto tool badge states. */
export const mapTraceStatusToToolBadge = (
  status?: TraceStatus,
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

/** Finds the newest leaf step in a trace tree. */
export const getLatestTraceStep = (node: TraceNode): TraceStep | undefined => {
  if (isTraceStep(node)) return node;
  for (let i = node.children.length - 1; i >= 0; i--) {
    const child = node.children[i]!;
    const latest = getLatestTraceStep(child);
    if (latest) return latest;
  }
  return undefined;
};

/** Resolves the visible label for a trace step. */
export const getTraceStepLabel = (step: TraceStep): ReactNode | undefined => {
  if (step.label !== undefined) return step.label;
  if (step.toolName) return `Tool: ${step.toolName}`;
  return undefined;
};

/** Metadata returned by custom message-part-to-trace inference. */
export type ChainOfThoughtTraceStepMeta = {
  label?: ReactNode | undefined;
  type?: StepType | undefined;
  status?: StepStatus | undefined;
  stepLabel?: string | number | undefined;
  icon?: LucideIcon | ReactNode | undefined;
};

/** Props passed to the default or custom trace group summary component. */
export type ChainOfThoughtTraceGroupSummaryProps = {
  group: TraceGroup;
  latestStep?: TraceStep | undefined;
  isOpen: boolean;
  canExpand: boolean;
  onToggle: () => void;
  depth?: number | undefined;
};

/** Override slots for structured trace rendering. */
export type ChainOfThoughtTraceNodeComponents = {
  GroupSummary?:
    | ComponentType<ChainOfThoughtTraceGroupSummaryProps>
    | undefined;
  StepBody?: ComponentType<{ step: TraceStep }> | undefined;
};

/** Props for rendering a pre-shaped `TraceNode[]` timeline. */
export type ChainOfThoughtTraceNodesProps = Omit<
  ComponentProps<typeof ChainOfThoughtTimeline>,
  "children"
> & {
  trace: TraceNode[];
  maxDepth?: number | undefined;
  nodeComponents?: ChainOfThoughtTraceNodeComponents | undefined;
  constrainHeight?: boolean | undefined;
  allowGroupExpand?: boolean | undefined;
};

/** Props for deriving a trace timeline from the active message parts. */
export type ChainOfThoughtTracePartsProps = Omit<
  ChainOfThoughtTraceNodesProps,
  "trace"
> & {
  trace?: undefined;
  groupingFunction?: PartsGroupedGroupingFunction | undefined;
  inferStep?:
    | ((args: {
        groupKey: string | undefined;
        indices: number[];
        parts: GroupingParts;
        isActive: boolean;
      }) => ChainOfThoughtTraceStepMeta)
    | undefined;
};

/** Props accepted by `ChainOfThought.Trace`. */
export type ChainOfThoughtTraceProps =
  | ChainOfThoughtTraceNodesProps
  | ChainOfThoughtTracePartsProps;

/** Shared props for the trace disclosure shell. */
export type ChainOfThoughtTraceDisclosureSharedProps = {
  label?: string | undefined;
  summary?: string | TraceSummaryFormatter | undefined;
  autoCollapseOnComplete?: boolean | undefined;
  disableGroupExpansionWhileStreaming?: boolean | undefined;
  rootProps?:
    | Omit<ChainOfThoughtRootProps, "open" | "onOpenChange" | "defaultOpen">
    | undefined;
  triggerProps?:
    | Omit<ChainOfThoughtTriggerProps, "reasoningLabel" | "phase">
    | undefined;
  contentProps?:
    | Omit<ComponentProps<typeof ChainOfThoughtContent>, "children">
    | undefined;
};

/** Props accepted by `ChainOfThought.TraceDisclosure`. */
export type ChainOfThoughtTraceDisclosureProps =
  | (ChainOfThoughtTraceNodesProps & ChainOfThoughtTraceDisclosureSharedProps)
  | (ChainOfThoughtTracePartsProps & ChainOfThoughtTraceDisclosureSharedProps);

type ToolCallPartLike = {
  type: "tool-call";
  toolName?: string | undefined;
};

const isToolCallPart = (part: unknown): part is ToolCallPartLike =>
  isRecord(part) && part.type === "tool-call";

/** Default inference used when deriving trace steps from message parts. */
export const defaultInferStep: NonNullable<
  ChainOfThoughtTracePartsProps["inferStep"]
> = ({ groupKey, parts, isActive }) => {
  const tool = parts.find(isToolCallPart);
  const toolName = tool?.toolName;
  const hasIncompletePart = parts.some((part) => {
    if (!isRecord(part)) return false;
    const status = part.status;
    return isRecord(status) && status.type === "incomplete";
  });
  const inferredStatus = hasIncompletePart
    ? { status: "error" as const }
    : isActive
      ? { status: "active" as const }
      : {};

  // Reuse the runtime inference so both paths agree and tool names are matched
  // case-insensitively (e.g. `WebSearch` → search, not the literal fallthrough).
  const type: StepType = toolName ? inferStepTypeFromTool(toolName) : "default";

  if (toolName) return { label: `Tool: ${toolName}`, type, ...inferredStatus };
  if (!groupKey) return { type, ...inferredStatus };
  return { label: "Step", type, ...inferredStatus };
};

/** Options for deriving a structured trace from message parts. */
export type TraceFromMessagePartsOptions = {
  groupingFunction?: PartsGroupedGroupingFunction | undefined;
  inferStep?: ChainOfThoughtTracePartsProps["inferStep"] | undefined;
};

/** Converts message parts into a flat trace using the configured grouping rules. */
export const traceFromMessageParts = (
  parts: GroupingParts,
  options: TraceFromMessagePartsOptions = {},
): TraceNode[] => {
  const groupingFunction =
    options.groupingFunction ?? groupMessagePartsByParentId;
  const inferStep = options.inferStep ?? defaultInferStep;
  const groups = groupingFunction(parts);

  return groups.map((group, index) => {
    const groupParts = group.indices
      .map((i) => parts[i])
      .filter((part): part is (typeof parts)[number] => Boolean(part));
    const isActive = groupParts.some((part) => {
      if (!isRecord(part)) return false;
      const status = part.status;
      if (!isRecord(status)) return false;
      return status.type === "running" || status.type === "requires-action";
    });
    const meta = inferStep({
      groupKey: group.groupKey,
      indices: group.indices,
      parts: groupParts,
      isActive,
    });
    const tool = groupParts.find(isToolCallPart);
    const toolName = tool?.toolName;

    return {
      kind: "step",
      // Prefer the caller's stable groupKey. The fallback keys off the first
      // part index (stable under append) and uses a reserved prefix so it can't
      // collide with a user-supplied groupKey. Custom grouping functions that
      // reorder groups should still return a stable `groupKey`.
      id: group.groupKey ?? `__step_${group.indices[0] ?? index}`,
      label: meta.label,
      ...(meta.type != null ? { type: meta.type } : {}),
      ...(meta.stepLabel !== undefined ? { stepLabel: meta.stepLabel } : {}),
      ...(meta.icon !== undefined ? { icon: meta.icon } : {}),
      ...(meta.status != null
        ? { status: stepStatusToTrace(meta.status) }
        : {}),
      ...(toolName != null ? { toolName } : {}),
    } satisfies TraceStep;
  });
};
