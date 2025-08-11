import { memo, useMemo, ComponentType } from "react";
import { MessageProvider } from "../message/MessageProvider";
import { useThread } from "./useThread";
import { useMessage } from "../message/useMessage";

interface ThreadPrimitiveMessagesProps {
  components: {
    UserMessage: ComponentType;
    AssistantMessage: ComponentType;
  };
}

const MessageRenderer = ({ components }: ThreadPrimitiveMessagesProps) => {
  const role = useMessage((m) => m.role);

  if (role === "user") {
    return <components.UserMessage />;
  } else if (role === "assistant") {
    return <components.AssistantMessage />;
  }

  throw new Error("Invalid message role");
};

MessageRenderer.displayName = "MessageRenderer";

interface MessageItemProps extends ThreadPrimitiveMessagesProps {
  messageIdx: number;
}

const MessageItem = memo<MessageItemProps>(({ messageIdx, components }) => {
  return (
    <MessageProvider messageIdx={messageIdx}>
      <MessageRenderer components={components} />
    </MessageProvider>
  );
});

MessageItem.displayName = "MessageItem";

export const ThreadPrimitiveMessages = ({
  components,
}: ThreadPrimitiveMessagesProps) => {
  const messagesLength = useThread()?.messages.length ?? 0;

  const memoizedComponents = useMemo(
    () => components,
    [components.UserMessage, components.AssistantMessage]
  );

  const messageItems = useMemo(
    () =>
      Array.from({ length: messagesLength }, (_, index) => (
        <MessageItem
          key={index}
          messageIdx={index}
          components={memoizedComponents}
        />
      )),
    [messagesLength, memoizedComponents]
  );

  return <>{messageItems}</>;
};

ThreadPrimitiveMessages.displayName = "ThreadPrimitiveMessages";
