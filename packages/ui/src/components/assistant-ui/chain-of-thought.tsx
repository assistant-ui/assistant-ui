"use client";

import { memo } from "react";
import {
  ChainOfThoughtContent,
  ChainOfThoughtRoot,
  ChainOfThoughtTrigger,
  type ChainOfThoughtRootProps,
  type ChainOfThoughtTriggerProps,
} from "./chain-of-thought/disclosure";
import {
  ChainOfThoughtPlaceholder,
  ChainOfThoughtTimeline,
} from "./chain-of-thought/layout";
import {
  ChainOfThoughtStep,
  ChainOfThoughtStepBody,
  ChainOfThoughtStepHeader,
} from "./chain-of-thought/step";
import {
  ChainOfThoughtImpl,
  type ChainOfThoughtProps,
} from "./chain-of-thought/runtime-root";
import {
  ChainOfThoughtTrace,
  ChainOfThoughtTraceDisclosure,
  type ChainOfThoughtTraceDisclosureProps,
  type ChainOfThoughtTraceProps,
} from "./chain-of-thought/trace";
import type {
  ToolActivity,
  ToolActivityContext,
} from "./chain-of-thought/runtime-activity";
import type {
  ChainOfThoughtPhase,
  StepStatus,
  StepType,
  TraceGroup,
  TraceNode,
  TraceStatus,
  TraceStep,
  TraceSummaryFormatter,
  TraceSummaryStats,
} from "./chain-of-thought/model";
import type {
  ChainOfThoughtTraceGroupSummaryProps,
  ChainOfThoughtTraceNodeComponents,
  ChainOfThoughtTraceStepMeta,
} from "./chain-of-thought/trace-shared";

// `memo` gates prop renders only; `useAuiState` still drives store updates.
const ChainOfThought = Object.assign(memo(ChainOfThoughtImpl), {
  Root: ChainOfThoughtRoot,
  Trigger: ChainOfThoughtTrigger,
  Content: ChainOfThoughtContent,
  Placeholder: ChainOfThoughtPlaceholder,
  Timeline: ChainOfThoughtTimeline,
  Step: ChainOfThoughtStep,
  StepHeader: ChainOfThoughtStepHeader,
  StepBody: ChainOfThoughtStepBody,
  Trace: ChainOfThoughtTrace,
  TraceDisclosure: ChainOfThoughtTraceDisclosure,
});

ChainOfThought.displayName = "ChainOfThought";

export { ChainOfThought };

export type { ChainOfThoughtStrings } from "./chain-of-thought/strings";

export type {
  ChainOfThoughtPhase,
  ChainOfThoughtProps,
  ChainOfThoughtRootProps,
  ChainOfThoughtTraceDisclosureProps,
  ChainOfThoughtTraceGroupSummaryProps,
  ChainOfThoughtTraceNodeComponents,
  ChainOfThoughtTraceProps,
  ChainOfThoughtTraceStepMeta,
  ChainOfThoughtTriggerProps,
  StepStatus,
  StepType,
  ToolActivity,
  ToolActivityContext,
  TraceGroup,
  TraceNode,
  TraceStatus,
  TraceStep,
  TraceSummaryFormatter,
  TraceSummaryStats,
};
