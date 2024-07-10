"use client";

import { ComponentPropsWithoutRef, forwardRef, type FC } from "react";
import { MessagePrimitive, MessagePrimitiveContentProps } from "../primitives";
import BranchPicker from "./branch-picker";
import { Avatar } from "./base/avatar";
import { withDefaults } from "./utils/withDefaults";
import { useThreadConfig } from "./thread-config";
import AssistantActionBar from "./assistant-action-bar";
import ContentPart from "./content-part";

const AssistantMessage: FC = () => {
  return (
    <AssistantMessageRoot>
      <AssistantMessageAvatar />
      <AssistantMessageContent />
      <BranchPicker />
      <AssistantActionBar />
    </AssistantMessageRoot>
  );
};

AssistantMessage.displayName = "AssistantMessage";

const AssistantMessageAvatar: FC = () => {
  const { assistantAvatar: avatar = { fallback: "A" } } = useThreadConfig();
  return <Avatar {...avatar} />;
};

const AssistantMessageRoot = withDefaults(MessagePrimitive.Root, {
  className: "aui-assistant-message-root",
});

AssistantMessageRoot.displayName = "AssistantMessageRoot";

const AssistantMessageContentWrapper = withDefaults("div", {
  className: "aui-assistant-message-content",
});

export type AssistantMessageContentProps = MessagePrimitiveContentProps &
  ComponentPropsWithoutRef<"div">;

const AssistantMessageContent = forwardRef<
  HTMLDivElement,
  AssistantMessageContentProps
>(({ components: componentsProp, ...rest }, ref) => {
  const { assistantMessage: { components = {} } = {} } = useThreadConfig();
  return (
    <AssistantMessageContentWrapper {...rest} ref={ref}>
      <MessagePrimitive.Content
        components={{
          ...componentsProp,
          Text: componentsProp?.Text ?? components.Text ?? ContentPart.Text,
        }}
      />
    </AssistantMessageContentWrapper>
  );
});

AssistantMessageContent.displayName = "AssistantMessageContent";

const exports = {
  Root: AssistantMessageRoot,
  Avatar: AssistantMessageAvatar,
  Content: AssistantMessageContent,
};

export default Object.assign(
  AssistantMessage,
  exports,
) as typeof AssistantMessage & typeof exports;
