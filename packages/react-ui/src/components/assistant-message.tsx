"use client";

import {
  MessagePrimitive,
  MessagePrimitiveContentProps,
} from "@assistant-ui/react";
import { ComponentPropsWithoutRef, forwardRef, type FC } from "react";
import { BranchPicker } from "./branch-picker";
import { Avatar } from "./base/avatar";
import { withDefaults } from "../utils/withDefaults";
import { useThreadConfig } from "./thread-config";
import { AssistantActionBar } from "./assistant-action-bar";
import { Text } from "./text";

export const AssistantMessage: FC = () => {
  return (
    <AssistantMessageRoot>
      <AssistantAvatar />
      <AssistantMessageContent />
      <BranchPicker />
      <AssistantActionBar />
    </AssistantMessageRoot>
  );
};

AssistantMessage.displayName = "AssistantMessage";

export const AssistantAvatar: FC = () => {
  const { assistantAvatar: avatar = { fallback: "A" } } = useThreadConfig();
  return <Avatar {...avatar} />;
};

export const AssistantMessageRoot = withDefaults(MessagePrimitive.Root, {
  className: "aui-assistant-message-root",
});

AssistantMessageRoot.displayName = "AssistantMessageRoot";

const AssistantMessageContentWrapper = withDefaults("div", {
  className: "aui-assistant-message-content",
});

export type AssistantMessageContentProps = MessagePrimitiveContentProps &
  ComponentPropsWithoutRef<"div">;

export const AssistantMessageContent = forwardRef<
  HTMLDivElement,
  AssistantMessageContentProps
>(({ components: componentsProp, ...rest }, ref) => {
  const { assistantMessage: { components = {} } = {} } = useThreadConfig();
  return (
    <AssistantMessageContentWrapper {...rest} ref={ref}>
      <MessagePrimitive.Content
        components={{ Text: components.Text ?? Text, ...components }}
      />
    </AssistantMessageContentWrapper>
  );
});

AssistantMessageContent.displayName = "AssistantMessageContent";
