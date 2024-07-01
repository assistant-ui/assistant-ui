import { useCallback } from "react";
import { ThreadContextValue, useThreadContext } from "../context";
import { AppendMessage } from "../types";

type CreateAppendMessage =
  | string
  | {
      parentId?: string | null | undefined;
      role?: AppendMessage["role"] | undefined;
      content: AppendMessage["content"];
    };

const toAppendMessage = (
  useThreadMessages: ThreadContextValue["useThreadMessages"],
  message: CreateAppendMessage,
): AppendMessage => {
  if (typeof message === "string") {
    return {
      parentId: useThreadMessages.getState().at(-1)?.id ?? null,
      role: "user",
      content: [{ type: "text", text: message }],
    };
  }

  return {
    parentId:
      message.parentId ?? useThreadMessages.getState().at(-1)?.id ?? null,
    role: message.role ?? "user",
    content: message.content,
  };
};

export const useAppendMessage = () => {
  const { useThreadMessages, useThreadActions, useViewport, useComposer } =
    useThreadContext();

  const append = useCallback(
    (message: CreateAppendMessage) => {
      const appendMessage = toAppendMessage(useThreadMessages, message);
      useThreadActions.getState().append(appendMessage);

      useViewport.getState().scrollToBottom();
      useComposer.getState().focus();
    },
    [useThreadMessages, useThreadActions, useViewport, useComposer],
  );

  return append;
};
