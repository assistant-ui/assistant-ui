"use client";

import { type FC, type PropsWithChildren, useEffect, useState } from "react";
import { StoreApi, create } from "zustand";
import { ContentPartContext } from "../react/ContentPartContext";
import type { ContentPartContextValue } from "../react/ContentPartContext";
import { useMessageContext } from "../react/MessageContext";
import type { MessageState } from "../stores";
import type { ContentPartState } from "../stores/ContentPart";
import { MessageStatus } from "../../types";

type ContentPartProviderProps = PropsWithChildren<{
  partIndex: number;
}>;

const DONE_STATUS: MessageStatus = { type: "done" };

const syncContentPart = (
  { message }: MessageState,
  useContentPart: ContentPartContextValue["useContentPart"],
  partIndex: number,
) => {
  const part = message.content[partIndex];
  if (!part) return;

  const messageStatus =
    message.role === "assistant" ? message.status : DONE_STATUS;
  const status =
    partIndex === message.content.length - 1 ? messageStatus : DONE_STATUS;

  // if the content part is the same, don't update
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
