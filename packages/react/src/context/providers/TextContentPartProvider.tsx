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
  ContentPartRuntime,
  ContentPartState,
} from "../../api/ContentPartRuntime";

type TextContentPartProviderProps = {
  text: string;
  isRunning?: boolean | undefined;
};

const COMPLETE_STATUS: ContentPartStatus = {
  type: "complete",
};

const RUNNING_STATUS: ContentPartStatus = {
  type: "running",
};

export const TextContentPartProvider: FC<
  PropsWithChildren<TextContentPartProviderProps>
> = ({ children, text, isRunning }) => {
  const [context] = useState<ContentPartContextValue>(() => {
    const useContentPartRuntime = create(
      // TODO
      () => new ContentPartRuntime(null as any, null as any, null as any),
    );
    const useContentPart = create<ContentPartState>(() => ({
      status: isRunning ? RUNNING_STATUS : COMPLETE_STATUS,
      part: { type: "text", text },
      type: "text",
      text,
    }));

    return { useContentPartRuntime, useContentPart };
  });

  useEffect(() => {
    const state = context.useContentPart.getState();
    const textUpdated = (state as TextContentPart).text !== text;
    const targetTextPart = textUpdated
      ? { type: "text" as const, text }
      : state;
    const targetStatus = isRunning ? RUNNING_STATUS : COMPLETE_STATUS;
    const statusUpdated = state.status !== targetStatus;

    if (!textUpdated && !statusUpdated) return;

    writableStore(context.useContentPart).setState(
      {
        part: targetTextPart,
        status: targetStatus,
      },
      true,
    );
  }, [context, isRunning, text]);

  return (
    <ContentPartContext.Provider value={context}>
      {children}
    </ContentPartContext.Provider>
  );
};
