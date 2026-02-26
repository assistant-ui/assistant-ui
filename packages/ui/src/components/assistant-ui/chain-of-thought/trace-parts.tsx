"use client";

import { useMemo } from "react";
import { useAuiState } from "@assistant-ui/react";
import { ChainOfThoughtTraceNodes } from "./trace-nodes";
import {
  defaultInferStep,
  groupMessagePartsByParentId,
  traceFromMessageParts,
  type ChainOfThoughtTracePartsProps,
} from "./trace-shared";

export function ChainOfThoughtTraceParts({
  trace: _trace,
  groupingFunction = groupMessagePartsByParentId,
  inferStep = defaultInferStep,
  ...props
}: ChainOfThoughtTracePartsProps) {
  const messageParts = useAuiState(({ message }) => message.parts);
  const trace = useMemo(
    () =>
      messageParts.length === 0
        ? []
        : traceFromMessageParts(messageParts, { groupingFunction, inferStep }),
    [groupingFunction, inferStep, messageParts],
  );

  return <ChainOfThoughtTraceNodes trace={trace} {...props} />;
}
