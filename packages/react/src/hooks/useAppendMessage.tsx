import { useCallback } from "react";
import { ThreadContextValue, useThreadContext } from "../context";
import { AppendMessage } from "../types";

type CreateAppendMessage =
  | string
  | {
      parentId?: string | null | undefined;
      role?: AppendMessage["role"];
      content: AppendMessage["content"];
    };

const toAppendMessage = (
  useThread: ThreadContextValue["useThread"],
  message: CreateAppendMessage,
): AppendMessage => {
  if (typeof message === "string") {
    return {
      parentId: useThread.getState().messages.at(-1)?.id ?? null,
      role: "user",
      content: [{ type: "text", text: message }],
    };
  }

  return {
    parentId:
      message.parentId ?? useThread.getState().messages.at(-1)?.id ?? null,
    role: message.role ?? "user",
    content: message.content,
  };
};

export const useAppendMessage = () => {
  const { useThread, useThreadActions, useViewport, useComposer } =
    useThreadContext();

  const append = useCallback(
    (message: CreateAppendMessage) => {
      const appendMessage = toAppendMessage(useThread, message);
      useThreadActions.getState().append(appendMessage);

      useViewport.getState().scrollToBottom();
      useComposer.getState().focus();
    },
    [useThread, useThreadActions, useViewport, useComposer],
  );

  return append;
};
