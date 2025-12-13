import { FC, useRef, useEffect, ReactElement, useCallback } from "react";
import { FlatList, FlatListProps } from "react-native";
import type { ThreadMessage } from "@assistant-ui/core";
import { useThread } from "../../hooks/useThread";
import { MessageProvider } from "../../context/MessageContext";

export type ThreadMessagesProps = Omit<
  FlatListProps<ThreadMessage>,
  "data" | "renderItem"
> & {
  /**
   * Render function for each message
   */
  renderMessage: (message: ThreadMessage, index: number) => ReactElement;

  /**
   * Whether to auto-scroll to bottom on new messages
   * @default true
   */
  autoScrollToBottom?: boolean;
};

export const ThreadMessages: FC<ThreadMessagesProps> = ({
  renderMessage,
  autoScrollToBottom = true,
  ...flatListProps
}) => {
  const flatListRef = useRef<FlatList>(null);
  const messages = useThread((state) => state.messages) as ThreadMessage[];

  useEffect(() => {
    if (autoScrollToBottom && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, autoScrollToBottom]);

  const handleContentSizeChange = useCallback(() => {
    if (autoScrollToBottom) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [autoScrollToBottom]);

  const renderItem = useCallback(
    ({ item, index }: { item: ThreadMessage; index: number }) => {
      return (
        <MessageProvider
          runtime={{
            getState: () => ({
              message: item,
              parentId: index > 0 ? (messages[index - 1]?.id ?? null) : null,
              isLast: index === messages.length - 1,
              branchNumber: 1,
              branchCount: 1,
            }),
            subscribe: () => () => {},
            reload: () => {},
            speak: () => {},
            stopSpeaking: () => {},
            submitFeedback: () => {},
            switchToBranch: () => {},
          }}
        >
          {renderMessage(item, index)}
        </MessageProvider>
      );
    },
    [renderMessage, messages],
  );

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      onContentSizeChange={handleContentSizeChange}
      showsVerticalScrollIndicator={false}
      {...flatListProps}
    />
  );
};
