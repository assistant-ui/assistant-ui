import { type ReactElement } from "react";
import { Box } from "ink";
import type { ThreadMessage } from "@assistant-ui/core";
import { useAui, useAuiState, AuiProvider, Derived } from "@assistant-ui/store";

export type ThreadMessagesProps = {
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

export const ThreadMessages = ({ renderMessage }: ThreadMessagesProps) => {
  const messages = useAuiState((s) => s.thread.messages);

  return (
    <Box flexDirection="column">
      {(messages as unknown as ThreadMessage[]).map((message, index) => (
        <MessageScope key={message.id} index={index}>
          {renderMessage({ message, index })}
        </MessageScope>
      ))}
    </Box>
  );
};
