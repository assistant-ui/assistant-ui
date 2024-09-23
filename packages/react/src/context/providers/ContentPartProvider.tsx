"use client";

import { type FC, type PropsWithChildren, useEffect, useState } from "react";
import { create } from "zustand";
import { ContentPartContext } from "../react/ContentPartContext";
import type { ContentPartContextValue } from "../react/ContentPartContext";
import { useMessageStore } from "../react/MessageContext";
import type { MessageState } from "../stores";
import type { ContentPartState } from "../stores/ContentPart";
import {
  ContentPartStatus,
  ThreadAssistantContentPart,
  ThreadMessage,
  ThreadUserContentPart,
  ToolCallContentPartStatus,
} from "../../types/AssistantTypes";
import { writableStore } from "../ReadonlyStore";

type ContentPartProviderProps = PropsWithChildren<{
  partIndex: number;
}>;

const COMPLETE_STATUS: ContentPartStatus = {
  type: "complete",
};

export const toContentPartStatus = (
  message: ThreadMessage,
  partIndex: number,
  part: ThreadUserContentPart | ThreadAssistantContentPart,
): ToolCallContentPartStatus => {
  if (message.role !== "assistant") return COMPLETE_STATUS;

  const isLastPart = partIndex === Math.max(0, message.content.length - 1);
  if (part.type !== "tool-call") {
    if (
      "reason" in message.status &&
      message.status.reason === "tool-calls" &&
      isLastPart
    )
      throw new Error(
        "Encountered unexpected requires-action status. This is likely an internal bug in assistant-ui.",
      );

    return isLastPart ? (message.status as ContentPartStatus) : COMPLETE_STATUS;
  }

  if (!!part.result) {
    return COMPLETE_STATUS;
  }

  return message.status as ToolCallContentPartStatus;
};

export const EMPTY_CONTENT = Object.freeze({ type: "text", text: "" });

const getContentPartState = (
  { message }: MessageState,
  useContentPart: ContentPartContextValue["useContentPart"] | undefined,
  partIndex: number,
) => {
  let part = message.content[partIndex];
  if (!part) {
    // for empty messages, show an empty text content part
    if (message.content.length === 0 && partIndex === 0) {
      part = EMPTY_CONTENT;
    } else {
      return null;
    }
  } else if (
    message.content.length === 1 &&
    part.type === "text" &&
    part.text.length === 0
  ) {
    // ensure reference equality for equivalent empty text parts
    part = EMPTY_CONTENT;
  }

  // if the content part is the same, don't update
  const status = toContentPartStatus(message, partIndex, part);
  const currentState = useContentPart?.getState();
  if (
    currentState &&
    currentState.part === part &&
    currentState.status === status
  )
    return null;

  return Object.freeze({ part, status });
};

const useContentPartContext = (partIndex: number) => {
  const messageStore = useMessageStore();
  const [context] = useState<ContentPartContextValue>(() => {
    const useContentPart = create<ContentPartState>(
      () => getContentPartState(messageStore.getState(), undefined, partIndex)!,
    );

    return { useContentPart };
  });

  useEffect(() => {
    const syncContentPart = (message: MessageState) => {
      const newState = getContentPartState(
        message,
        context.useContentPart,
        partIndex,
      );
      if (!newState) return;
      writableStore(context.useContentPart).setState(newState, true);
    };

    syncContentPart(messageStore.getState());
    return messageStore.subscribe(syncContentPart);
  }, [context, messageStore, partIndex]);

  return context;
};

export const ContentPartProvider: FC<ContentPartProviderProps> = ({
  partIndex,
  children,
}) => {
  const context = useContentPartContext(partIndex);

  return (
    <ContentPartContext.Provider value={context}>
      {children}
    </ContentPartContext.Provider>
  );
};
