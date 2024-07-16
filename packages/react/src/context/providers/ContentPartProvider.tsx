"use client";

import { type FC, type PropsWithChildren, useEffect, useState } from "react";
import { StoreApi, create } from "zustand";
import { ContentPartContext } from "../react/ContentPartContext";
import type { ContentPartContextValue } from "../react/ContentPartContext";
import { useMessageContext } from "../react/MessageContext";
import type { MessageState } from "../stores";
import type { ContentPartState } from "../stores/ContentPart";
import {
  ContentPartStatus,
  ThreadAssistantContentPart,
  ThreadMessage,
  ThreadUserContentPart,
  ToolContentPartStatus,
} from "../../types/AssistantTypes";

type ContentPartProviderProps = PropsWithChildren<{
  partIndex: number;
}>;

const COMPLETE_STATUS: ContentPartStatus = {
  type: "complete",
};

const toContentPartStatus = (
  message: ThreadMessage,
  partIndex: number,
  part: ThreadUserContentPart | ThreadAssistantContentPart,
): ToolContentPartStatus => {
  if (message.role !== "assistant") return COMPLETE_STATUS;

  const isLastPart = partIndex === message.content.length - 1;
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

  return message.status as ToolContentPartStatus;
};

const syncContentPart = (
  { message }: MessageState,
  useContentPart: ContentPartContextValue["useContentPart"],
  partIndex: number,
) => {
  const part = message.content[partIndex];
  if (!part) return;

  // if the content part is the same, don't update
  const status = toContentPartStatus(message, partIndex, part);
  const currentState = useContentPart.getState();
  if (currentState.part === part && currentState.status === status) return;

  // sync useContentPart
  (useContentPart as unknown as StoreApi<ContentPartState>).setState(
    Object.freeze({
      part,
      status,
    }),
  );
};

const useContentPartContext = (partIndex: number) => {
  const { useMessage } = useMessageContext();
  const [context] = useState<ContentPartContextValue>(() => {
    const useContentPart = create<ContentPartState>(
      () => ({}) as ContentPartState,
    );

    syncContentPart(useMessage.getState(), useContentPart, partIndex);

    return { useContentPart };
  });

  useEffect(() => {
    syncContentPart(useMessage.getState(), context.useContentPart, partIndex);
    return useMessage.subscribe((message) => {
      syncContentPart(message, context.useContentPart, partIndex);
    });
  }, [context, useMessage, partIndex]);

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
