import { type ReactElement, useCallback } from "react";
import { FlatList, type FlatListProps } from "react-native";
import type { ThreadMessage, MessageRuntime } from "@assistant-ui/core";
import { useThreadRuntime } from "../../context";
import { MessageProvider } from "../../context";
import { useThreadMessages } from "../../primitive-hooks/useThreadMessages";

export type ThreadMessagesProps = Omit<
  FlatListProps<ThreadMessage>,
  "data" | "renderItem"
> & {
  renderMessage: (props: {
    message: ThreadMessage;
    index: number;
  }) => ReactElement;
};

export const ThreadMessages = ({
  renderMessage,
  ...flatListProps
}: ThreadMessagesProps) => {
  const messages = useThreadMessages();
  const threadRuntime = useThreadRuntime();

  const renderItem = useCallback(
    ({ item, index }: { item: ThreadMessage; index: number }) => {
      const messageRuntime: MessageRuntime =
        threadRuntime.getMessageByIndex(index);
      return (
        <MessageProvider runtime={messageRuntime}>
          {renderMessage({ message: item, index })}
        </MessageProvider>
      );
    },
    [threadRuntime, renderMessage],
  );

  const keyExtractor = useCallback((item: ThreadMessage) => item.id, []);

  return (
    <FlatList
      data={messages as ThreadMessage[]}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      {...flatListProps}
    />
  );
};
