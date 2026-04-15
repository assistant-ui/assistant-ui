"use client";

import { type FC, type PropsWithChildren, useMemo } from "react";
import type {
  ThreadMessage,
  SerializedThreadMessage,
} from "@assistant-ui/core";
import { deserializeMessages, isSerializedMessages } from "@assistant-ui/core";
import { ReadonlyThreadProvider } from "@assistant-ui/core/react";

export namespace ThreadReadOnly {
  export type Props = PropsWithChildren<{
    messages: readonly ThreadMessage[] | readonly SerializedThreadMessage[];
  }>;
}

export const ThreadReadOnly: FC<ThreadReadOnly.Props> = ({
  messages,
  children,
}) => {
  const threadMessages = useMemo(() => {
    if (isSerializedMessages(messages)) {
      return deserializeMessages(messages);
    }
    return messages as readonly ThreadMessage[];
  }, [messages]);

  return (
    <ReadonlyThreadProvider messages={threadMessages}>
      {children}
    </ReadonlyThreadProvider>
  );
};
