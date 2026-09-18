import type { ReasoningMessagePartComponent } from "@assistant-ui/react-native";
import { memo } from "react";
import { MarkdownText } from "./markdown-text";
import {
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
  type ReasoningRootProps,
} from "./reasoning";

export type { ReasoningRootProps } from "./reasoning";
export {
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from "./reasoning";

const ReasoningImpl: ReasoningMessagePartComponent = ({ text, status }) => (
  <MarkdownText type="text" text={text} status={status} variant="muted" />
);

export const Reasoning = memo(
  ReasoningImpl,
) as unknown as ReasoningMessagePartComponent & {
  Root: typeof ReasoningRoot;
  Trigger: typeof ReasoningTrigger;
  Content: typeof ReasoningContent;
  Text: typeof ReasoningText;
};

Reasoning.displayName = "Reasoning";
Reasoning.Root = ReasoningRoot;
Reasoning.Trigger = ReasoningTrigger;
Reasoning.Content = ReasoningContent;
Reasoning.Text = ReasoningText;
