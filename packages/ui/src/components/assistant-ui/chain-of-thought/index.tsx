"use client";

import { memo } from "react";
import {
  ChainOfThoughtAnnouncer,
  ChainOfThoughtBadge,
  ChainOfThoughtContent,
  ChainOfThoughtFade,
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
  ChainOfThoughtTrigger,
  Crossfade,
  STEP_BASE_CLASS,
  chainOfThoughtVariants,
  stepTypeIcons,
} from "./core";
import {
  ChainOfThoughtTrace,
  ChainOfThoughtTraceDisclosure,
  ChainOfThoughtTraceNodes,
  ChainOfThoughtTraceParts,
} from "./trace";
import {
  ChainOfThoughtImpl,
  ChainOfThoughtTraceTool,
  type ChainOfThoughtProps,
} from "./runtime";

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

export * from "./core";
export * from "./trace";
export * from "./runtime";
export {
  ChainOfThought,
  chainOfThoughtVariants,
  STEP_BASE_CLASS,
  stepTypeIcons,
};
