"use client";

import { MessagePrimitive } from "@assistant-ui/react";
import { ComponentPropsWithoutRef, forwardRef, type FC } from "react";
import { BranchPicker } from "./branch-picker";
import { styled } from "../styled";
import { MessagePrimitiveContentProps } from "@assistant-ui/react";
import { UserActionBar } from "./user-action-bar";
import { Text } from "./text";

export const UserMessage: FC = () => {
  return (
    <UserMessageRoot>
      <UserActionBar />
      <UserMessageContent />
      <BranchPicker />
    </UserMessageRoot>
  );
};

UserMessage.displayName = "UserMessage";

export const UserMessageRoot = styled(MessagePrimitive.Root, {
  className: "aui-user-message-root",
});

UserMessageRoot.displayName = "UserMessageRoot";

const UserMessageContentWrapper = styled("div", {
  className: "aui-user-message-content",
});

export type UserMessageContentProps = MessagePrimitiveContentProps &
  ComponentPropsWithoutRef<"div">;

export const UserMessageContent = forwardRef<
  HTMLDivElement,
  UserMessageContentProps
>(({ components, ...props }, ref) => {
  return (
    <UserMessageContentWrapper {...props} ref={ref}>
      <MessagePrimitive.Content components={{ Text, ...components }} />
    </UserMessageContentWrapper>
  );
});

UserMessageContent.displayName = "UserMessageContent";
