"use client";

import { ComponentPropsWithoutRef, forwardRef, type FC } from "react";

import BranchPicker from "./branch-picker";
import { withDefaults } from "./utils/withDefaults";
import UserActionBar from "./user-action-bar";
import ContentPart from "./content-part";
import { MessagePrimitive, MessagePrimitiveContentProps } from "../primitives";

const UserMessage: FC = () => {
  return (
    <UserMessageRoot>
      <UserActionBar />
      <UserMessageContent />
      <BranchPicker />
    </UserMessageRoot>
  );
};

UserMessage.displayName = "UserMessage";

const UserMessageRoot = withDefaults(MessagePrimitive.Root, {
  className: "aui-user-message-root",
});

UserMessageRoot.displayName = "UserMessageRoot";

const UserMessageContentWrapper = withDefaults("div", {
  className: "aui-user-message-content",
});

export type UserMessageContentProps = MessagePrimitiveContentProps &
  ComponentPropsWithoutRef<"div">;

const UserMessageContent = forwardRef<HTMLDivElement, UserMessageContentProps>(
  ({ components, ...props }, ref) => {
    return (
      <UserMessageContentWrapper {...props} ref={ref}>
        <MessagePrimitive.Content
          components={{
            ...components,
            Text: components?.Text ?? ContentPart.Text,
          }}
        />
      </UserMessageContentWrapper>
    );
  },
);

UserMessageContent.displayName = "UserMessageContent";

const exports = {
  Root: UserMessageRoot,
  Content: UserMessageContent,
};

export default Object.assign(UserMessage, exports) as typeof UserMessage &
  typeof exports;
