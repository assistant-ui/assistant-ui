"use client";

import type { FC, PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { create } from "zustand";
import {
  ContentPartContext,
  ContentPartContextValue,
} from "../react/ContentPartContext";
import { ContentPartStatus, TextContentPart } from "../../types/AssistantTypes";
import { writableStore } from "../ReadonlyStore";
import {
  ContentPartRuntimeImpl,
  ContentPartState,
} from "../../api/ContentPartRuntime";

export namespace TextContentPartProvider {
  export type Props = PropsWithChildren<{
    text: string;
    isRunning?: boolean | undefined;
  }>;
}

const COMPLETE_STATUS: ContentPartStatus = {
  type: "complete",
};

const RUNNING_STATUS: ContentPartStatus = {
  type: "running",
};

export const TextContentPartProvider: FC<TextContentPartProvider.Props> = ({
  children,
  text,
  isRunning,
}) => {
  const [context] = useState<ContentPartContextValue>(() => {
    const useContentPart = create<ContentPartState>(() => ({
      status: isRunning ? RUNNING_STATUS : COMPLETE_STATUS,
      type: "text",
      text,
    }));

    const useContentPartRuntime = create(
      () =>
        new ContentPartRuntimeImpl({
          path: {
            ref: "text",
            threadSelector: { type: "main" },
            messageSelector: { type: "messageId", messageId: "" },
            contentPartSelector: { type: "index", index: 0 },
          },
          getState: useContentPart.getState,
          subscribe: useContentPart.subscribe,
        }),
    );

    return { useContentPartRuntime, useContentPart };
  });

  useEffect(() => {
    const state = context.useContentPart.getState() as ContentPartState & {
      type: "text";
    };

    const textUpdated = (state as TextContentPart).text !== text;
    const targetStatus = isRunning ? RUNNING_STATUS : COMPLETE_STATUS;
    const statusUpdated = state.status !== targetStatus;

    if (!textUpdated && !statusUpdated) return;

    writableStore(context.useContentPart).setState(
      {
        type: "text",
        text,
        status: targetStatus,
      } satisfies ContentPartState,
      true,
    );
  }, [context, isRunning, text]);

  return (
    <ContentPartContext.Provider value={context}>
      {children}
    </ContentPartContext.Provider>
  );
};
