"use client";

import { type CSSProperties, type ReactNode } from "react";
import type { TraceStep } from "./model";
import {
  ChainOfThoughtStep,
  ChainOfThoughtStepBody,
  ChainOfThoughtStepHeader,
  ChainOfThoughtToolBadge,
} from "./step";
import {
  getTraceStepLabel,
  isRecord,
  mapTraceStatusToStepStatus,
  mapTraceStatusToToolBadge,
  type ChainOfThoughtTraceNodeComponents,
} from "./trace-shared";

const DefaultTraceStepBody: NonNullable<
  ChainOfThoughtTraceNodeComponents["StepBody"]
> = ({ step }) => {
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
        <div className="text-muted-foreground/80 text-sm">{output}</div>
      ) : null}
      {step.detail != null ? <div>{step.detail}</div> : null}
    </ChainOfThoughtStepBody>
  );
};

export function ChainOfThoughtTraceStepNode({
  step,
  nodeComponents,
  style,
  className,
}: {
  step: TraceStep;
  nodeComponents?: ChainOfThoughtTraceNodeComponents;
  style?: CSSProperties;
  className?: string;
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
      className={className}
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
