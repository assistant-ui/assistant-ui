"use client";

import {
  type FC,
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useMemo,
} from "react";
import { AssistantContext } from "../utils/context/AssistantContext";
import type {
  CreateThreadMessage,
  ThreadMessage,
} from "../utils/context/AssistantTypes";
import { useDummyAIAssistantContext } from "./useDummyAIAssistantContext";

type RSCMessage = {
  id: string;
  role: "user" | "assistant";
  display: ReactNode;
};

type VercelAIAssistantProviderProps = PropsWithChildren<{
  messages: RSCMessage[];
  append: (message: CreateThreadMessage) => Promise<void>;
}>;

const ThreadMessageCache = new WeakMap<RSCMessage, ThreadMessage>();
const vercelToThreadMessage = (message: RSCMessage): ThreadMessage => {
  if (message.role !== "user" && message.role !== "assistant")
    throw new Error("Unsupported role");

  return {
    id: message.id,
    role: message.role,
    content: [{ type: "ui", display: message.display }],
  };
};

const vercelToCachedThreadMessages = (messages: RSCMessage[]) => {
  return messages.map((m) => {
    const cached = ThreadMessageCache.get(m);
    if (cached) return cached;
    const newMessage = vercelToThreadMessage(m);
    ThreadMessageCache.set(m, newMessage);
    return newMessage;
  });
};

export const VercelRSCAssistantProvider: FC<VercelAIAssistantProviderProps> = ({
  children,
  messages: vercelMessages,
  append: vercelAppend,
}) => {
  const context = useDummyAIAssistantContext();

  // -- useThread sync --

  const messages = useMemo(() => {
    return vercelToCachedThreadMessages(vercelMessages);
  }, [vercelMessages]);

  const append = useCallback(
    async (message: CreateThreadMessage) => {
      // TODO image/ui support
      if (message.content[0]?.type !== "text") {
        throw new Error("Only text content is currently supported");
      }

      await vercelAppend({
        role: message.role,
        content: [{ type: "text", text: message.content[0].text }],
      });
    },
    [vercelAppend],
  );

  useMemo(() => {
    context.useThread.setState({
      messages,
      append,
    });
  }, [context, messages, append]);

  // -- useBranchObserver sync --

  // const branches = useVercelAIBranches(vercel);

  // useMemo(() => {
  //   context.useBranchObserver.setState(branches, true);
  // }, [context, branches]);

  return (
    <AssistantContext.Provider value={context}>
      {children}
    </AssistantContext.Provider>
  );
};
