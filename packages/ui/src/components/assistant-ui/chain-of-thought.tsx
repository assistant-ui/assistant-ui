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
 * Built on `ChainOfThoughtPrimitive`, which the upstream docs treat as the
 * legacy accordion API (there is no `@deprecated` marker in source). If you
 * need full control over grouping (e.g. mixing tool
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
// `Object.assign` makes the slot map a single literal that is both the runtime
// value and the inferred type — a forgotten member is a compile error, unlike
// the previous `as unknown as` cast that let the two lists drift silently.
//
// Note: `memo` here gates re-renders on PROPS only. Because the runtime impl
// reads its data via `useAuiState` selectors, store-driven updates re-render
// regardless; hoist/memoize any object/function props for the memo to help.
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
