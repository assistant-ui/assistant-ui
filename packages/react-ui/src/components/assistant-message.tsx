"use client";

import {
  MessagePrimitive,
  MessagePrimitiveContentProps,
} from "@assistant-ui/react";
import { ComponentPropsWithoutRef, forwardRef, type FC } from "react";
import { BranchPicker } from "./branch-picker";
import { Avatar } from "./base/avatar";
import { styled } from "../styled";
import { useThreadConfig } from "./thread-config";
import { AssistantActionBar } from "./assistant-action-bar";

export const AssistantMessage: FC = () => {
  const {
    assistantAvatar: avatar = { fallback: "A" },
    assistantMessage: { components } = {},
  } = useThreadConfig();
  return (
    <AssistantMessageRoot>
      <Avatar {...avatar} />
      <AssistantMessageContent components={components} />
      <BranchPicker />
      <AssistantActionBar />
    </AssistantMessageRoot>
  );
};

AssistantMessage.displayName = "AssistantMessage";

export const AssistantMessageRoot = styled(MessagePrimitive.Root, {
  className: "aui-assistant-message-root",
});

AssistantMessageRoot.displayName = "AssistantMessageRoot";

const AssistantMessageContentWrapper = styled("div", {
  className: "aui-assistant-message-content",
});

export type AssistantMessageContentProps = MessagePrimitiveContentProps &
  ComponentPropsWithoutRef<"div">;

export const AssistantMessageContent = forwardRef<
  HTMLDivElement,
  AssistantMessageContentProps
>(({ components, ...rest }, ref) => {
  return (
    <AssistantMessageContentWrapper {...rest} ref={ref}>
      <MessagePrimitive.Content components={components} />
    </AssistantMessageContentWrapper>
  );
});

AssistantMessageContent.displayName = "AssistantMessageContent";
