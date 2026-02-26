"use client";

import type { ComponentProps, ComponentType, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { MessagePrimitive, type ThreadMessage } from "@assistant-ui/react";
import { ChainOfThoughtContent, ChainOfThoughtTimeline } from "./core";
import type {
  ChainOfThoughtRootProps,
  ChainOfThoughtTriggerProps,
  StepStatus,
  StepType,
  TraceGroup,
  TraceNode,
  TraceStatus,
  TraceStep,
  TraceSummaryFormatter,
} from "./core";

export type PartsGroupedGroupingFunction = ComponentProps<
  typeof MessagePrimitive.Unstable_PartsGrouped
>["groupingFunction"];

type MessagePartGroup = ReturnType<PartsGroupedGroupingFunction>[number];

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getParentId = (part: unknown): string | undefined => {
  if (!isRecord(part)) return undefined;
  const parentId = part["parentId"];
  return typeof parentId === "string" ? parentId : undefined;
};

export const groupMessagePartsByParentId: PartsGroupedGroupingFunction = (
  parts: readonly any[],
) => {
  // Map maintains insertion order, so groups appear in order of first occurrence
  const groupMap = new Map<string, number[]>();

  for (let i = 0; i < parts.length; i++) {
    const parentId = getParentId(parts[i]);
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

export const isTraceStep = (node: TraceNode): node is TraceStep =>
  node.kind === "step";

export const mapTraceStatusToStepStatus = (
  status?: TraceStatus,
): StepStatus => {
  switch (status) {
    case "running":
      return "active";
    case "incomplete":
    case "error":
      return "error";
    default:
      return "complete";
  }
};

const stepStatusToTrace = (s: StepStatus): TraceStatus =>
  s === "active" ? "running" : s === "pending" ? "incomplete" : s;

export const mapTraceStatusToToolBadge = (
  status?: TraceStatus,
): "running" | "complete" | "error" => {
  switch (status) {
    case "running":
      return "running";
    case "incomplete":
    case "error":
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
  label?: ReactNode;
  type?: StepType;
  status?: StepStatus;
  stepLabel?: string | number;
  icon?: LucideIcon | ReactNode;
};

export type ChainOfThoughtTraceGroupSummaryProps = {
  group: TraceGroup;
  latestStep?: TraceStep;
  isOpen: boolean;
  canExpand: boolean;
  onToggle: () => void;
  depth?: number;
};

export type ChainOfThoughtTraceNodeComponents = {
  GroupSummary?: ComponentType<ChainOfThoughtTraceGroupSummaryProps>;
  StepBody?: ComponentType<{ step: TraceStep }>;
};

export type ChainOfThoughtTraceNodesProps = Omit<
  ComponentProps<typeof ChainOfThoughtTimeline>,
  "children"
> & {
  trace: TraceNode[];
  maxDepth?: number;
  nodeComponents?: ChainOfThoughtTraceNodeComponents;
  constrainHeight?: boolean;
  allowGroupExpand?: boolean;
};

export type ChainOfThoughtTracePartsProps = Omit<
  ComponentProps<typeof ChainOfThoughtTimeline>,
  "children"
> & {
  trace?: undefined;
  groupingFunction?: PartsGroupedGroupingFunction;
  components?: ComponentProps<
    typeof MessagePrimitive.Unstable_PartsGrouped
  >["components"];
  inferStep?: (args: {
    groupKey: string | undefined;
    indices: number[];
    parts: readonly any[];
    isActive: boolean;
  }) => ChainOfThoughtTraceStepMeta;
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
    | Omit<ChainOfThoughtRootProps, "open" | "onOpenChange">
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
  toolName?: string;
};

const isToolCallPart = (part: unknown): part is ToolCallPartLike =>
  isRecord(part) && part["type"] === "tool-call";

export const defaultInferStep: NonNullable<
  ChainOfThoughtTracePartsProps["inferStep"]
> = ({ groupKey, parts }) => {
  const tool = parts.find(isToolCallPart);
  const toolName = tool?.toolName;

  const type: StepType = toolName
    ? toolName.includes("search")
      ? "search"
      : toolName.includes("image")
        ? "image"
        : "tool"
    : "default";

  if (toolName) return { label: `Tool: ${toolName}`, type };
  if (!groupKey) return { type };
  return { label: "Step", type };
};

export type TraceFromMessagePartsOptions = {
  groupingFunction?: PartsGroupedGroupingFunction;
  inferStep?: ChainOfThoughtTracePartsProps["inferStep"];
};

export const traceFromMessageParts = (
  parts: readonly any[],
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
    const meta = inferStep({
      groupKey: group.groupKey,
      indices: group.indices,
      parts: groupParts,
      isActive: false,
    });
    const tool = groupParts.find(isToolCallPart);
    const toolName = tool?.toolName;

    return {
      kind: "step",
      id: group.groupKey ?? `step-${index}`,
      label: meta.label,
      ...(meta.type != null ? { type: meta.type } : {}),
      ...(meta.status != null
        ? { status: stepStatusToTrace(meta.status) }
        : {}),
      ...(toolName != null ? { toolName } : {}),
    } satisfies TraceStep;
  });
};

export type TraceFromThreadMessageOptions = TraceFromMessagePartsOptions;

export const traceFromThreadMessage = (
  message: ThreadMessage,
  options: TraceFromThreadMessageOptions = {},
): TraceNode[] => {
  return traceFromMessageParts(message.content, options);
};
