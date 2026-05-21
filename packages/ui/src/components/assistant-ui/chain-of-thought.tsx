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
import type { ToolActivity } from "./chain-of-thought/runtime-activity";
import type {
  ChainOfThoughtPhase,
  StepStatus,
  StepType,
  TraceGroup,
  TraceNode,
  TraceStatus,
  TraceStep,
} from "./chain-of-thought/model";

/**
 * `ChainOfThought` groups consecutive reasoning and tool-call message parts
 * into a single collapsible "thinking" panel. Mount it as the
 * `components.ChainOfThought` slot on `MessagePrimitive.Parts` and the
 * component will subscribe to the chain-of-thought scope automatically.
 *
 * For free-form composition, use the namespaced primitives
 * (`ChainOfThought.Root`, `.Trigger`, `.Content`, `.Timeline`, `.Step`).
 * For rendering a pre-shaped trace (e.g. from a server-side tool agent),
 * use `ChainOfThought.Trace` or `ChainOfThought.TraceDisclosure`.
 *
 * @remarks
 * Built on `ChainOfThoughtPrimitive`, which upstream marks as the legacy
 * accordion API. If you need full control over grouping (e.g. mixing tool
 * calls with custom adjacent parts), prefer composing
 * `MessagePrimitive.GroupedParts` directly — see the guide at
 * `/docs/guides/chain-of-thought`. This component is intended as the
 * batteries-included default for the common chain-of-thought case.
 *
 * @example
 * ```tsx
 * <MessagePrimitive.Parts components={{ ChainOfThought }} />
 * ```
 */
const ChainOfThought = memo(
  ChainOfThoughtImpl,
) as unknown as React.MemoExoticComponent<typeof ChainOfThoughtImpl> & {
  Root: typeof ChainOfThoughtRoot;
  Trigger: typeof ChainOfThoughtTrigger;
  Content: typeof ChainOfThoughtContent;
  Placeholder: typeof ChainOfThoughtPlaceholder;
  Timeline: typeof ChainOfThoughtTimeline;
  Step: typeof ChainOfThoughtStep;
  StepHeader: typeof ChainOfThoughtStepHeader;
  StepBody: typeof ChainOfThoughtStepBody;
  Trace: typeof ChainOfThoughtTrace;
  TraceDisclosure: typeof ChainOfThoughtTraceDisclosure;
};

ChainOfThought.displayName = "ChainOfThought";
ChainOfThought.Root = ChainOfThoughtRoot;
ChainOfThought.Trigger = ChainOfThoughtTrigger;
ChainOfThought.Content = ChainOfThoughtContent;
ChainOfThought.Placeholder = ChainOfThoughtPlaceholder;
ChainOfThought.Timeline = ChainOfThoughtTimeline;
ChainOfThought.Step = ChainOfThoughtStep;
ChainOfThought.StepHeader = ChainOfThoughtStepHeader;
ChainOfThought.StepBody = ChainOfThoughtStepBody;
ChainOfThought.Trace = ChainOfThoughtTrace;
ChainOfThought.TraceDisclosure = ChainOfThoughtTraceDisclosure;

export { ChainOfThought };

export type {
  ChainOfThoughtPhase,
  ChainOfThoughtProps,
  ChainOfThoughtRootProps,
  ChainOfThoughtTraceDisclosureProps,
  ChainOfThoughtTraceProps,
  ChainOfThoughtTriggerProps,
  StepStatus,
  StepType,
  ToolActivity,
  TraceGroup,
  TraceNode,
  TraceStatus,
  TraceStep,
};
