"use client";

import { memo } from "react";
import {
  ChainOfThoughtContent,
  ChainOfThoughtFade,
  ChainOfThoughtRoot,
  ChainOfThoughtTrigger,
  type ChainOfThoughtRootProps,
  type ChainOfThoughtTriggerProps,
} from "./chain-of-thought/disclosure";
import {
  ChainOfThoughtPlaceholder,
  ChainOfThoughtText,
  ChainOfThoughtTimeline,
  type ChainOfThoughtTextProps,
  type ChainOfThoughtTimelineProps,
} from "./chain-of-thought/layout";
import {
  collectTraceStats,
  stepTypeIcons,
  summarizeTraceStats,
  traceHasRunning,
  type ChainOfThoughtPhase,
  type StepStatus,
  type StepType,
  type TraceGroup,
  type TraceNode,
  type TraceOutputStatus,
  type TraceStatus,
  type TraceStep,
  type TraceStepOutput,
  type TraceSummaryFormatter,
  type TraceSummaryStats,
} from "./chain-of-thought/model";
import {
  BulletDot,
  ChainOfThoughtAnnouncer,
  ChainOfThoughtBadge,
  ChainOfThoughtStep,
  ChainOfThoughtStepBadges,
  ChainOfThoughtStepBody,
  ChainOfThoughtStepHeader,
  ChainOfThoughtStepImage,
  ChainOfThoughtToolBadge,
  renderStepTypeBaseIcon,
  type ChainOfThoughtStepProps,
  type ChainOfThoughtToolBadgeProps,
} from "./chain-of-thought/step";
import {
  STEP_BASE_CLASS,
  STEP_ICON_CLASS,
  chainOfThoughtVariants,
} from "./chain-of-thought/styles";
import {
  ChainOfThoughtImpl,
  ChainOfThoughtTraceTool,
  type ChainOfThoughtProps,
  type ToolActivity,
} from "./chain-of-thought/runtime";
import {
  ChainOfThoughtTrace,
  ChainOfThoughtTraceDisclosure,
  ChainOfThoughtTraceNodes,
  ChainOfThoughtTraceParts,
  traceFromMessageParts,
  traceFromThreadMessage,
  useElapsedSeconds,
  type ChainOfThoughtTraceDisclosureProps,
  type ChainOfThoughtTraceGroupSummaryProps,
  type ChainOfThoughtTraceNodeComponents,
  type ChainOfThoughtTraceProps,
  type ChainOfThoughtTraceStepMeta,
  type TraceFromMessagePartsOptions,
  type TraceFromThreadMessageOptions,
} from "./chain-of-thought/trace";
import { Crossfade } from "./chain-of-thought/crossfade";

const ChainOfThought = memo(
  ChainOfThoughtImpl,
) as unknown as React.ComponentType<ChainOfThoughtProps> & {
  Root: typeof ChainOfThoughtRoot;
  Trigger: typeof ChainOfThoughtTrigger;
  Content: typeof ChainOfThoughtContent;
  Text: typeof ChainOfThoughtText;
  Fade: typeof ChainOfThoughtFade;
  Placeholder: typeof ChainOfThoughtPlaceholder;
  Trace: typeof ChainOfThoughtTrace;
  TraceNodes: typeof ChainOfThoughtTraceNodes;
  TraceParts: typeof ChainOfThoughtTraceParts;
  TraceDisclosure: typeof ChainOfThoughtTraceDisclosure;
  Timeline: typeof ChainOfThoughtTimeline;
  Step: typeof ChainOfThoughtStep;
  StepHeader: typeof ChainOfThoughtStepHeader;
  StepBody: typeof ChainOfThoughtStepBody;
  StepBadges: typeof ChainOfThoughtStepBadges;
  StepImage: typeof ChainOfThoughtStepImage;
  Badge: typeof ChainOfThoughtBadge;
  ToolBadge: typeof ChainOfThoughtToolBadge;
  TraceTool: typeof ChainOfThoughtTraceTool;
  Announcer: typeof ChainOfThoughtAnnouncer;
  Crossfade: typeof Crossfade;
};

ChainOfThought.displayName = "ChainOfThought";
ChainOfThought.Root = ChainOfThoughtRoot;
ChainOfThought.Trigger = ChainOfThoughtTrigger;
ChainOfThought.Content = ChainOfThoughtContent;
ChainOfThought.Text = ChainOfThoughtText;
ChainOfThought.Fade = ChainOfThoughtFade;
ChainOfThought.Placeholder = ChainOfThoughtPlaceholder;
ChainOfThought.Trace = ChainOfThoughtTrace;
ChainOfThought.TraceNodes = ChainOfThoughtTraceNodes;
ChainOfThought.TraceParts = ChainOfThoughtTraceParts;
ChainOfThought.TraceDisclosure = ChainOfThoughtTraceDisclosure;
ChainOfThought.Timeline = ChainOfThoughtTimeline;
ChainOfThought.Step = ChainOfThoughtStep;
ChainOfThought.StepHeader = ChainOfThoughtStepHeader;
ChainOfThought.StepBody = ChainOfThoughtStepBody;
ChainOfThought.StepBadges = ChainOfThoughtStepBadges;
ChainOfThought.StepImage = ChainOfThoughtStepImage;
ChainOfThought.Badge = ChainOfThoughtBadge;
ChainOfThought.ToolBadge = ChainOfThoughtToolBadge;
ChainOfThought.TraceTool = ChainOfThoughtTraceTool;
ChainOfThought.Announcer = ChainOfThoughtAnnouncer;
ChainOfThought.Crossfade = Crossfade;

export {
  BulletDot,
  ChainOfThought,
  ChainOfThoughtAnnouncer,
  ChainOfThoughtBadge,
  ChainOfThoughtContent,
  ChainOfThoughtFade,
  ChainOfThoughtImpl,
  ChainOfThoughtPlaceholder,
  ChainOfThoughtRoot,
  ChainOfThoughtStep,
  ChainOfThoughtStepBadges,
  ChainOfThoughtStepBody,
  ChainOfThoughtStepHeader,
  ChainOfThoughtStepImage,
  ChainOfThoughtText,
  ChainOfThoughtTimeline,
  ChainOfThoughtToolBadge,
  ChainOfThoughtTrace,
  ChainOfThoughtTraceDisclosure,
  ChainOfThoughtTraceNodes,
  ChainOfThoughtTraceParts,
  ChainOfThoughtTraceTool,
  ChainOfThoughtTrigger,
  Crossfade,
  STEP_BASE_CLASS,
  STEP_ICON_CLASS,
  chainOfThoughtVariants,
  collectTraceStats,
  renderStepTypeBaseIcon,
  stepTypeIcons,
  summarizeTraceStats,
  traceFromMessageParts,
  traceFromThreadMessage,
  traceHasRunning,
  useElapsedSeconds,
};

export type {
  ChainOfThoughtPhase,
  ChainOfThoughtProps,
  ChainOfThoughtRootProps,
  ChainOfThoughtStepProps,
  ChainOfThoughtTextProps,
  ChainOfThoughtTimelineProps,
  ChainOfThoughtToolBadgeProps,
  ChainOfThoughtTraceDisclosureProps,
  ChainOfThoughtTraceGroupSummaryProps,
  ChainOfThoughtTraceNodeComponents,
  ChainOfThoughtTraceProps,
  ChainOfThoughtTraceStepMeta,
  ChainOfThoughtTriggerProps,
  StepStatus,
  StepType,
  ToolActivity,
  TraceFromMessagePartsOptions,
  TraceFromThreadMessageOptions,
  TraceGroup,
  TraceNode,
  TraceOutputStatus,
  TraceStatus,
  TraceStep,
  TraceStepOutput,
  TraceSummaryFormatter,
  TraceSummaryStats,
};
