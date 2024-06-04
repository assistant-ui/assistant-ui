"use client";

import {
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useMemo,
} from "react";
import { AssistantContext } from "../../utils/context/AssistantContext";
import type {
  AppendMessage,
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
  append: (message: AppendMessage) => Promise<void>;
  edit?: (message: AppendMessage) => Promise<void>;
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
  return {
    id: message.id,
    role: message.role,
    content: [{ type: "ui", display: message.display }],
    createdAt: message.createdAt ?? new Date(),
  };
};

const EMPTY_BRANCHES: never[] = [];
const getBranches = () => {
  return EMPTY_BRANCHES;
};

const switchToBranch = () => {
  throw new Error(
    "Branch switching is not supported by VercelRSCAssistantProvider.",
  );
};

const cancelRun = () => {
  // in dev mode, log a warning
  if (process.env["NODE_ENV"] === "development") {
    console.warn(
      "Run cancellation is not supported by VercelRSCAssistantProvider.",
    );
  }
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
    async (message: AppendMessage) => {
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
