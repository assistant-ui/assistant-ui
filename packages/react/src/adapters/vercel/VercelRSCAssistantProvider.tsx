"use client";

import {
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

type VercelRSCAssistantProviderBaseProps<T> = PropsWithChildren<{
  messages: T[];
  append: (message: CreateThreadMessage) => Promise<void>;
  edit?: (message: CreateThreadMessage) => Promise<void>;
  reload?: (parentId: string | null) => Promise<void>;
  convertMessage?: (message: T) => VercelRSCMessage;
}>;

type RSCMessageConverter<T> = {
  convertMessage: (message: T) => VercelRSCMessage;
};

export type VercelRSCAssistantProviderProps<T = VercelRSCMessage> =
  VercelRSCAssistantProviderBaseProps<T> &
    (T extends VercelRSCMessage ? object : RSCMessageConverter<T>);

const ThreadMessageCache = new WeakMap<object, ThreadMessage>();
const vercelToThreadMessage = (message: VercelRSCMessage): ThreadMessage => {
  if (message.role !== "user" && message.role !== "assistant")
    throw new Error("Unsupported role");

  return {
    id: message.id,
    role: message.role,
    content: [{ type: "ui", display: message.display }],
    createdAt: message.createdAt ?? new Date(),
  };
};

const vercelToCachedThreadMessages = <T extends object>(
  messages: T[],
  convertMessage: (message: T) => VercelRSCMessage,
) => {
  return messages.map((m) => {
    const cached = ThreadMessageCache.get(m);
    if (cached) return cached;
    const newMessage = vercelToThreadMessage(convertMessage(m));
    ThreadMessageCache.set(m, newMessage);
    return newMessage;
  });
};

export const VercelRSCAssistantProvider = <
  T extends object = VercelRSCMessage,
>({
  children,
  convertMessage,
  messages: vercelMessages,
  append: appendCallback,
  edit,
  reload,
}: VercelRSCAssistantProviderProps<T>) => {
  const context = useDummyAIAssistantContext();

  // -- useThread sync --

  const messages = useMemo(() => {
    return vercelToCachedThreadMessages<T>(
      vercelMessages,
      convertMessage ?? ((m: T) => m as VercelRSCMessage),
    );
  }, [convertMessage, vercelMessages]);

  const append = useCallback(
    async (message: CreateThreadMessage) => {
      if (
        message.parentId !==
        (context.useThread.getState().messages.at(-1)?.id ?? null)
      ) {
        if (!edit)
          throw new Error(
            "Unexpected: Message editing is not supported, no edit callback was provided to VercelRSCAssistantProvider.",
          );
        await edit(message);
      } else {
        await appendCallback(message);
      }
    },
    [context, appendCallback, edit],
  );

  const startRun = useCallback(
    async (parentId: string | null) => {
      if (!reload)
        throw new Error(
          "Unexpected: Message reloading is not supported, no reload callback was provided to VercelRSCAssistantProvider.",
        );
      await reload(parentId);
    },
    [reload],
  );

  useMemo(() => {
    context.useThread.setState({
      messages,
      append,
      startRun,
    });
  }, [context, messages, append, startRun]);

  return (
    <AssistantContext.Provider value={context}>
      {children}
    </AssistantContext.Provider>
  );
};
