"use client";

import { BotIcon, ChevronDownIcon } from "lucide-react";
import {
  type CSSProperties,
  type ComponentType,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Collapsible } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChainOfThoughtContent } from "./disclosure";
import { ChainOfThoughtTimeline } from "./layout";
import {
  stepTypeIcons,
  type TraceGroup,
  type TraceNode,
  type TraceStep,
} from "./model";
import { STEP_ICON_CLASS } from "./styles";
import {
  BulletDot,
  ChainOfThoughtStep,
  ChainOfThoughtStepBody,
  ChainOfThoughtStepHeader,
  ChainOfThoughtToolBadge,
} from "./step";
import { isRecord } from "./runtime-activity";
import {
  getLatestTraceStep,
  getTraceStepLabel,
  isTraceGroup,
  mapTraceStatusToStepStatus,
  mapTraceStatusToToolBadge,
  type ChainOfThoughtTraceGroupSummaryProps,
  type ChainOfThoughtTraceNodeComponents,
  type ChainOfThoughtTraceNodesProps,
} from "./trace-shared";

const DefaultTraceGroupSummary: ComponentType<
  ChainOfThoughtTraceGroupSummaryProps
> = ({ group, latestStep, isOpen, canExpand, onToggle }) => {
  const toolName = group.summary?.toolName ?? latestStep?.toolName;
  const latestLabel =
    group.summary?.latestLabel ??
    (latestStep ? getTraceStepLabel(latestStep) : undefined);
  const badgeStatus = mapTraceStatusToToolBadge(
    latestStep?.status ?? group.status,
  );

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!canExpand}
      data-slot="chain-of-thought-trace-group-summary"
      data-variant={group.variant ?? "default"}
      className={cn(
        "aui-chain-of-thought-trace-group-summary group/trace-summary w-full text-left",
        "rounded-md px-0 py-0 transition-colors",
        "disabled:cursor-default",
      )}
      aria-expanded={canExpand ? isOpen : undefined}
    >
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="shrink-0 font-medium text-foreground">
          {group.label}
        </span>
        {latestLabel != null ? (
          <span className="min-w-0 truncate text-muted-foreground">
            {latestLabel}
          </span>
        ) : null}
        {toolName ? (
          <span className="inline-flex h-5 shrink-0 items-center">
            <ChainOfThoughtToolBadge
              toolName={toolName}
              status={badgeStatus}
              showIcon={false}
            />
          </span>
        ) : null}
      </div>
    </button>
  );
};

const DefaultTraceStepBody: NonNullable<
  ChainOfThoughtTraceNodeComponents["StepBody"]
> = ({ step }) => {
  const isStreamingOutput =
    isRecord(step.output) &&
    "content" in step.output &&
    step.output.status === "streaming";
  const output = (() => {
    if (step.output == null) return null;
    if (isRecord(step.output) && "content" in step.output) {
      return step.output.content as ReactNode;
    }
    return step.output as ReactNode;
  })();

  if (output == null && step.detail == null) return null;

  return (
    <ChainOfThoughtStepBody className="space-y-1">
      {output != null ? (
        <div
          className="text-muted-foreground text-sm"
          {...(isStreamingOutput ? { "aria-busy": true } : {})}
        >
          {output}
        </div>
      ) : null}
      {step.detail != null ? <div>{step.detail}</div> : null}
    </ChainOfThoughtStepBody>
  );
};

function resolveGroupIcon({
  isSubagent,
  canExpand,
  isOpen,
  type,
}: {
  isSubagent: boolean;
  canExpand: boolean;
  isOpen: boolean;
  type: string;
}) {
  if (canExpand) {
    return (
      <ChevronDownIcon
        aria-hidden
        className={cn(
          STEP_ICON_CLASS,
          "text-muted-foreground transition-transform duration-150 ease-out",
          "motion-reduce:transition-none",
          isOpen ? "rotate-0" : "-rotate-90",
        )}
      />
    );
  }

  if (isSubagent) return <BotIcon className={STEP_ICON_CLASS} />;
  const TypeIcon = stepTypeIcons[type as keyof typeof stepTypeIcons];
  if (TypeIcon === null || !TypeIcon) return <BulletDot />;
  return <TypeIcon className={STEP_ICON_CLASS} />;
}

function TraceStepNode({
  step,
  nodeComponents,
  style,
}: {
  step: TraceStep;
  nodeComponents?: ChainOfThoughtTraceNodeComponents | undefined;
  style?: CSSProperties | undefined;
}) {
  const StepBody = nodeComponents?.StepBody ?? DefaultTraceStepBody;
  const label = getTraceStepLabel(step);
  const status = mapTraceStatusToStepStatus(step.status);
  const type = step.type ?? (step.toolName ? "tool" : "default");
  const isActive = step.status === "running";
  const isTextType = type === "text";
  const isMonologue = isTextType && !step.toolName;

  const toolBadge = step.toolName ? (
    <span className="inline-flex h-5 shrink-0 items-center">
      <ChainOfThoughtToolBadge
        toolName={step.toolName}
        status={mapTraceStatusToToolBadge(step.status)}
        showIcon={false}
        className="min-w-0 max-w-[7rem]"
      />
    </span>
  ) : null;
  const showHeader = !isMonologue && (label !== undefined || toolBadge);

  return (
    <ChainOfThoughtStep
      data-role="trace-step"
      status={status}
      active={isActive}
      type={isMonologue ? "default" : type}
      {...(step.stepLabel !== undefined ? { stepLabel: step.stepLabel } : {})}
      {...(step.icon !== undefined ? { icon: step.icon } : {})}
      style={style}
    >
      {showHeader ? (
        <ChainOfThoughtStepHeader className="flex items-center gap-2">
          {label !== undefined ? <span>{label}</span> : null}
          {toolBadge}
        </ChainOfThoughtStepHeader>
      ) : null}
      <StepBody step={step} />
    </ChainOfThoughtStep>
  );
}

function TraceGroupNode({
  group,
  depth,
  maxDepth,
  nodeComponents,
  allowGroupExpand,
  renderNode,
  style,
}: {
  group: TraceGroup;
  depth: number;
  maxDepth: number;
  nodeComponents?: ChainOfThoughtTraceNodeComponents | undefined;
  allowGroupExpand: boolean;
  renderNode: (node: TraceNode, index: number, depth: number) => ReactNode;
  style?: CSSProperties | undefined;
}) {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    if (!allowGroupExpand) setIsOpen(false);
  }, [allowGroupExpand]);

  const latestStep = useMemo(() => getLatestTraceStep(group), [group]);
  const canExpand =
    allowGroupExpand && depth < maxDepth && group.children.length > 0;
  const GroupSummary = nodeComponents?.GroupSummary ?? DefaultTraceGroupSummary;
  const isSubagent = group.variant === "subagent";
  const groupStatus = group.status ?? latestStep?.status;
  const type =
    group.summary?.latestType ??
    latestStep?.type ??
    (latestStep?.toolName ? "tool" : "default");

  return (
    <ChainOfThoughtStep
      data-role="trace-group"
      data-variant={group.variant ?? "default"}
      status={mapTraceStatusToStepStatus(groupStatus)}
      active={groupStatus === "running"}
      type={isSubagent ? "default" : type}
      icon={resolveGroupIcon({
        isSubagent,
        canExpand,
        isOpen,
        type,
      })}
      iconPulse={!(isSubagent && canExpand)}
      style={style}
    >
      <ChainOfThoughtStepBody>
        <GroupSummary
          group={group}
          {...(latestStep != null ? { latestStep } : {})}
          isOpen={isOpen}
          canExpand={canExpand}
          depth={depth}
          onToggle={() => {
            if (!canExpand) return;
            setIsOpen((prev) => !prev);
          }}
        />
        <Collapsible
          open={isOpen && canExpand}
          onOpenChange={(next) => {
            if (canExpand) setIsOpen(next);
          }}
        >
          <ChainOfThoughtContent className="mt-1" showFade={false}>
            <ChainOfThoughtTimeline autoScroll={false} constrainHeight={false}>
              {group.children.map((node, i) => renderNode(node, i, depth + 1))}
            </ChainOfThoughtTimeline>
          </ChainOfThoughtContent>
        </Collapsible>
      </ChainOfThoughtStepBody>
    </ChainOfThoughtStep>
  );
}

/** Renders a structured trace tree as a ChainOfThought timeline. */
export function ChainOfThoughtTraceNodes({
  className,
  trace,
  maxDepth = 2,
  nodeComponents,
  constrainHeight = true,
  allowGroupExpand = true,
  ...timelineProps
}: ChainOfThoughtTraceNodesProps) {
  const renderNode = (
    node: TraceNode,
    stepIndex: number,
    depth: number,
  ): ReactNode => {
    const style = { "--step-index": stepIndex } as CSSProperties;
    if (isTraceGroup(node)) {
      return (
        <TraceGroupNode
          key={node.id}
          group={node}
          depth={depth}
          maxDepth={maxDepth}
          nodeComponents={nodeComponents}
          allowGroupExpand={allowGroupExpand}
          renderNode={renderNode}
          style={style}
        />
      );
    }
    return (
      <TraceStepNode
        key={node.id}
        step={node}
        nodeComponents={nodeComponents}
        style={style}
      />
    );
  };

  return (
    <ChainOfThoughtTimeline
      className={className}
      constrainHeight={constrainHeight}
      {...timelineProps}
    >
      {trace.map((node, i) => renderNode(node, i, 0))}
    </ChainOfThoughtTimeline>
  );
}
