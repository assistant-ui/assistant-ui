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
import type {
  ToolActivity,
  ToolActivityContext,
} from "./chain-of-thought/runtime-activity";
import type {
  ChainOfThoughtPhase,
  StepStatus,
  StepType,
} from "./chain-of-thought/model";

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
});

ChainOfThought.displayName = "ChainOfThought";

export { ChainOfThought };

export type { ChainOfThoughtStrings } from "./chain-of-thought/strings";

export type {
  ChainOfThoughtPhase,
  ChainOfThoughtProps,
  ChainOfThoughtRootProps,
  ChainOfThoughtTriggerProps,
  StepStatus,
  StepType,
  ToolActivity,
  ToolActivityContext,
};
