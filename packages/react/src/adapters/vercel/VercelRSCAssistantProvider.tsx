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
import { ThreadMessageConverter } from "../ThreadMessageConverter";
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

export const VercelRSCAssistantProvider = <
  T extends WeakKey = VercelRSCMessage,
>({
  children,
  convertMessage,
  messages: vercelMessages,
  append: appendCallback,
  edit,
  reload,
}: VercelRSCAssistantProviderProps<T>) => {
  const context = useDummyAIAssistantContext();

  const converter = useMemo(() => {
    const rscConverter = convertMessage ?? ((m: T) => m as VercelRSCMessage);
    return new ThreadMessageConverter<T>((m) => {
      return vercelToThreadMessage(rscConverter(m));
    });
  }, [convertMessage]);

  // -- useThread sync --

  const messages = useMemo(() => {
    return converter.convertMessages(vercelMessages);
  }, [converter, vercelMessages]);

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
