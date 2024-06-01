"use client";

import {
  type FC,
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useMemo,
} from "react";
import { AssistantContext } from "../../utils/context/AssistantContext";
import type {
  CreateThreadMessage,
  ThreadMessage,
} from "../../utils/context/stores/AssistantTypes";
import { useDummyAIAssistantContext } from "./useDummyAIAssistantContext";

export type VercelRSCMessage = {
  id: string;
  role: "user" | "assistant";
  display: ReactNode;
  createdAt?: Date;
};

export type VercelRSCAssistantProviderProps = PropsWithChildren<{
  messages: VercelRSCMessage[];
  append: (message: CreateThreadMessage) => Promise<void>;
}>;

const ThreadMessageCache = new WeakMap<VercelRSCMessage, ThreadMessage>();
const vercelToThreadMessage = (
  parentId: string | null,
  message: VercelRSCMessage,
): ThreadMessage => {
  if (message.role !== "user" && message.role !== "assistant")
    throw new Error("Unsupported role");

  return {
    parentId: parentId,
    id: message.id,
    role: message.role,
    content: [{ type: "ui", display: message.display }],
    createdAt: message.createdAt ?? new Date(),
  };
};

const vercelToCachedThreadMessages = (messages: VercelRSCMessage[]) => {
  return messages.map((m, idx) => {
    const cached = ThreadMessageCache.get(m);
    const parentId = messages[idx - 1]?.id ?? null;
    if (cached && cached.parentId === parentId) return cached;
    const newMessage = vercelToThreadMessage(parentId, m);
    ThreadMessageCache.set(m, newMessage);
    return newMessage;
  });
};

export const VercelRSCAssistantProvider: FC<VercelRSCAssistantProviderProps> =
  ({ children, messages: vercelMessages, append: vercelAppend }) => {
    const context = useDummyAIAssistantContext();

    // -- useThread sync --

    const messages = useMemo(() => {
      return vercelToCachedThreadMessages(vercelMessages);
    }, [vercelMessages]);

    const append = useCallback(
      async (message: CreateThreadMessage) => {
        if (
          message.parentId !==
          (context.useThread.getState().messages.at(-1)?.id ?? null)
        )
          throw new Error("Unexpected: Message editing is not supported");

        // TODO image/ui support
        if (message.content[0]?.type !== "text") {
          throw new Error("Only text content is currently supported");
        }

        await vercelAppend(message);
      },
      [context, vercelAppend],
    );

    useMemo(() => {
      context.useThread.setState({
        messages,
        append,
      });
    }, [context, messages, append]);

    return (
      <AssistantContext.Provider value={context}>
        {children}
      </AssistantContext.Provider>
    );
  };
