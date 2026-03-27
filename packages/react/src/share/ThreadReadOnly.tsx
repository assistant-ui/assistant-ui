"use client";

import { type FC, type PropsWithChildren, useMemo } from "react";
import type {
  ThreadMessage,
  SerializedThreadMessage,
} from "@assistant-ui/core";
import { deserializeMessages } from "@assistant-ui/core";
import { ReadonlyThreadProvider } from "@assistant-ui/core/react";

export namespace ThreadReadOnly {
  export type Props = PropsWithChildren<{
    messages: readonly ThreadMessage[] | readonly SerializedThreadMessage[];
  }>;
}

const areSerializedMessages = (
  messages: readonly ThreadMessage[] | readonly SerializedThreadMessage[],
): messages is readonly SerializedThreadMessage[] =>
  messages.length > 0 && typeof messages[0]!.createdAt === "string";

export const ThreadReadOnly: FC<ThreadReadOnly.Props> = ({
  messages,
  children,
}) => {
  const threadMessages = useMemo(() => {
    if (areSerializedMessages(messages)) {
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
