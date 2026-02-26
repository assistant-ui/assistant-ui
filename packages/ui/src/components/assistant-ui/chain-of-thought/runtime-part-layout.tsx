"use client";

import { type FC, type PropsWithChildren } from "react";
import { useAuiState } from "@assistant-ui/react";
import type { ChainOfThoughtPhase, StepType } from "./model";
import {
  inferStepTypeFromTool,
  isMessageStatusStreaming,
  mapPartStatusToStepStatus,
} from "./runtime-activity";
import {
  ChainOfThoughtStep,
  ChainOfThoughtStepBody,
  ChainOfThoughtStepHeader,
} from "./step";

export const ChainOfThoughtPrimitivePartLayout: FC<
  PropsWithChildren<{ partIndex?: number }>
> = ({ children, partIndex }) => {
  const part = useAuiState((s) => s.part);
  if (part.type !== "tool-call" && part.type !== "reasoning") {
    return <>{children}</>;
  }

  const statusType = part.status?.type;
  const messageStatusType = useAuiState((s) => s.message.status?.type);
  const isStreamingFromMessage = isMessageStatusStreaming(messageStatusType);
  const isLastPartInGroup = useAuiState((s) => {
    const parts = s.chainOfThought.parts;
    if (partIndex != null) {
      return partIndex === parts.length - 1;
    }
    const lastPart = parts[parts.length - 1];
    return Object.is(s.part, lastPart);
  });
  const isToolCall = part.type === "tool-call";
  const toolName = isToolCall ? part.toolName : undefined;
  const stepType: StepType = isToolCall
    ? inferStepTypeFromTool(toolName ?? "tool")
    : "default";
  const isActive =
    statusType === "running" ||
    statusType === "requires-action" ||
    (isStreamingFromMessage && isLastPartInGroup);
  const mappedStepStatus = mapPartStatusToStepStatus(statusType);
  return (
    <ChainOfThoughtStep
      status={mappedStepStatus}
      active={isActive}
      type={stepType}
    >
      <ChainOfThoughtStepBody>{children}</ChainOfThoughtStepBody>
    </ChainOfThoughtStep>
  );
};

export function ChainOfThoughtTerminalStep({
  phase,
  elapsedSeconds,
}: {
  phase: ChainOfThoughtPhase;
  elapsedSeconds?: number;
}) {
  const isIncomplete = phase === "incomplete";
  const label = isIncomplete
    ? elapsedSeconds
      ? `Stopped after ${elapsedSeconds}s`
      : "Stopped"
    : elapsedSeconds
      ? `Done in ${elapsedSeconds}s`
      : "Done";

  return (
    <ChainOfThoughtStep
      status={isIncomplete ? "error" : "complete"}
      type={isIncomplete ? "error" : "complete"}
    >
      <ChainOfThoughtStepHeader data-slot="chain-of-thought-terminal-step-label">
        {label}
      </ChainOfThoughtStepHeader>
    </ChainOfThoughtStep>
  );
}
