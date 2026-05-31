"use client";

import type { FC, PropsWithChildren } from "react";
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
import { useChainOfThoughtStrings } from "./strings";

export const ChainOfThoughtPrimitivePartLayout: FC<PropsWithChildren> = ({
  children,
}) => {
  const part = useAuiState((s) => s.part);
  const messageStatusType = useAuiState((s) => s.message.status?.type);
  const isLastPartInGroup = useAuiState((s) => {
    const parts = s.chainOfThought.parts;
    const lastPart = parts[parts.length - 1];
    return Object.is(s.part, lastPart);
  });

  if (part.type !== "tool-call" && part.type !== "reasoning") {
    return <>{children}</>;
  }

  const statusType = part.status?.type;
  const isStreamingFromMessage = isMessageStatusStreaming(messageStatusType);
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
  elapsedSeconds?: number | undefined;
}) {
  const strings = useChainOfThoughtStrings();
  const isIncomplete = phase === "incomplete";
  const label = isIncomplete
    ? strings.stopped(elapsedSeconds)
    : strings.done(elapsedSeconds);

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
