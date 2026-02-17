import { type ReactElement, useCallback } from "react";
import { FlatList, type FlatListProps } from "react-native";
import type { ThreadMessage } from "@assistant-ui/core";
import { useAui, useAuiState, AuiProvider, Derived } from "@assistant-ui/store";

export type ThreadMessagesProps = Omit<
  FlatListProps<ThreadMessage>,
  "data" | "renderItem"
> & {
  renderMessage: (props: {
    message: ThreadMessage;
    index: number;
  }) => ReactElement;
};

const MessageScope = ({
  index,
  children,
}: {
  index: number;
  children: ReactElement;
}) => {
  const aui = useAui({
    message: Derived({
      source: "thread",
      query: { type: "index", index },
      get: (aui) => aui.threads().thread("main").message({ index }),
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};

export const ThreadMessages = ({
  renderMessage,
  ...flatListProps
}: ThreadMessagesProps) => {
  const messages = useAuiState((s) => s.thread.messages);

  const renderItem = useCallback(
    ({ item, index }: { item: ThreadMessage; index: number }) => {
      return (
        <MessageScope index={index}>
          {renderMessage({ message: item as ThreadMessage, index })}
        </MessageScope>
      );
    },
    [renderMessage],
  );

  const keyExtractor = useCallback((item: ThreadMessage) => item.id, []);

  return (
    <FlatList
      data={messages as unknown as ThreadMessage[]}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      {...flatListProps}
    />
  );
};
