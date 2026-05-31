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

export const groupMessagePartsByParentId: PartsGroupedGroupingFunction = (
  parts,
) => {
  const messageParts = parts as readonly TraceMessagePart[];

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

export const isTraceGroup = (node: TraceNode): node is TraceGroup =>
  node.kind === "group";

const isTraceStep = (node: TraceNode): node is TraceStep =>
  node.kind === "step";

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

export const getLatestTraceStep = (node: TraceNode): TraceStep | undefined => {
  if (isTraceStep(node)) return node;
  for (let i = node.children.length - 1; i >= 0; i--) {
    const child = node.children[i]!;
    const latest = getLatestTraceStep(child);
    if (latest) return latest;
  }
  return undefined;
};

export const getTraceStepLabel = (step: TraceStep): ReactNode | undefined => {
  if (step.label !== undefined) return step.label;
  if (step.toolName) return `Tool: ${step.toolName}`;
  return undefined;
};

export type ChainOfThoughtTraceStepMeta = {
  label?: ReactNode | undefined;
  type?: StepType | undefined;
  status?: StepStatus | undefined;
  stepLabel?: string | number | undefined;
  icon?: LucideIcon | ReactNode | undefined;
};

export type ChainOfThoughtTraceGroupSummaryProps = {
  group: TraceGroup;
  latestStep?: TraceStep | undefined;
  isOpen: boolean;
  canExpand: boolean;
  onToggle: () => void;
  depth?: number | undefined;
};

export type ChainOfThoughtTraceNodeComponents = {
  GroupSummary?:
    | ComponentType<ChainOfThoughtTraceGroupSummaryProps>
    | undefined;
  StepBody?: ComponentType<{ step: TraceStep }> | undefined;
};

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

export type ChainOfThoughtTraceProps =
  | ChainOfThoughtTraceNodesProps
  | ChainOfThoughtTracePartsProps;

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

export type ChainOfThoughtTraceDisclosureProps =
  | (ChainOfThoughtTraceNodesProps & ChainOfThoughtTraceDisclosureSharedProps)
  | (ChainOfThoughtTracePartsProps & ChainOfThoughtTraceDisclosureSharedProps);

type ToolCallPartLike = {
  type: "tool-call";
  toolName?: string | undefined;
};

const isToolCallPart = (part: unknown): part is ToolCallPartLike =>
  isRecord(part) && part.type === "tool-call";

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

  const type: StepType = toolName ? inferStepTypeFromTool(toolName) : "default";

  if (toolName) return { label: `Tool: ${toolName}`, type, ...inferredStatus };
  if (!groupKey) return { type, ...inferredStatus };
  return { label: "Step", type, ...inferredStatus };
};

export type TraceFromMessagePartsOptions = {
  groupingFunction?: PartsGroupedGroupingFunction | undefined;
  inferStep?: ChainOfThoughtTracePartsProps["inferStep"] | undefined;
};

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
      // Fallback is stable under append and reserved away from user group keys.
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
