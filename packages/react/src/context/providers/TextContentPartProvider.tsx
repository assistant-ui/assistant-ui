"use client";

import { FC, PropsWithChildren, useEffect, useState } from "react";
import { create, StoreApi, UseBoundStore } from "zustand";
import {
  ContentPartContext,
  ContentPartContextValue,
} from "../react/ContentPartContext";
import { ContentPartStatus } from "../../types/AssistantTypes";
import { writableStore } from "../ReadonlyStore";
import {
  ContentPartRuntimeImpl,
  ContentPartState,
} from "../../api/ContentPartRuntime";
import { ensureBinding } from "../react/utils/ensureBinding";

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
  const [context] = useState<
    ContentPartContextValue & {
      useContentPart: UseBoundStore<
        StoreApi<ContentPartState & { type: "text" }>
      >;
    }
  >(() => {
    const useContentPart = create<ContentPartState & { type: "text" }>(() => ({
      status: isRunning ? RUNNING_STATUS : COMPLETE_STATUS,
      type: "text",
      text,
    }));

    const contentPartRuntime = new ContentPartRuntimeImpl({
      path: {
        ref: "text",
        threadSelector: { type: "main" },
        messageSelector: { type: "messageId", messageId: "" },
        contentPartSelector: { type: "index", index: 0 },
      },
      getState: useContentPart.getState,
      subscribe: useContentPart.subscribe,
    });
    ensureBinding(contentPartRuntime);

    const useContentPartRuntime = create(() => contentPartRuntime);

    return { useContentPartRuntime, useContentPart };
  });

  useEffect(() => {
    const state = context.useContentPart.getState();
    const textUpdated = state.text !== text;
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
