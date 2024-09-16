import { useCallback } from "react";
import {
  ThreadMessagesState,
  useThreadActionsStore,
  useThreadMessagesStore,
  useThreadViewportStore,
} from "../context";
import { AppendMessage } from "../types";
import { useThreadComposerStore } from "../context/react/ThreadContext";
import { ReadonlyStore } from "../context/ReadonlyStore";

type CreateAppendMessage =
  | string
  | {
      parentId?: string | null | undefined;
      role?: AppendMessage["role"] | undefined;
      content: AppendMessage["content"];
      attachments?: AppendMessage["attachments"] | undefined;
    };

const toAppendMessage = (
  useThreadMessages: ReadonlyStore<ThreadMessagesState>,
  message: CreateAppendMessage,
): AppendMessage => {
  if (typeof message === "string") {
    return {
      parentId: useThreadMessages.getState().at(-1)?.id ?? null,
      role: "user",
      content: [{ type: "text", text: message }],
      attachments: [],
    };
  }

  return {
    parentId:
      message.parentId ?? useThreadMessages.getState().at(-1)?.id ?? null,
    role: message.role ?? "user",
    content: message.content,
    attachments: message.attachments ?? [],
  } as AppendMessage;
};

export const useAppendMessage = () => {
  const threadMessagesStore = useThreadMessagesStore();
  const threadActionsStore = useThreadActionsStore();
  const threadViewportStore = useThreadViewportStore();
  const threadComposerStore = useThreadComposerStore();

  const append = useCallback(
    (message: CreateAppendMessage) => {
      const appendMessage = toAppendMessage(threadMessagesStore, message);
      threadActionsStore.getState().append(appendMessage);

      threadViewportStore.getState().scrollToBottom();
      threadComposerStore.getState().focus();
    },
    [
      threadMessagesStore,
      threadActionsStore,
      threadViewportStore,
      threadComposerStore,
    ],
  );

  return append;
};
