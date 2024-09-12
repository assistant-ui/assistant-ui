"use client";

import type { FC, PropsWithChildren } from "react";
import { useState } from "react";
import { ContentPartState } from "../stores";
import { create } from "zustand";
import {
  ContentPartContext,
  ContentPartContextValue,
} from "../react/ContentPartContext";

type TextContentPartProviderProps = {
  text: string;
};

export const TextContentPartProvider: FC<
  PropsWithChildren<TextContentPartProviderProps>
> = ({ children, text }) => {
  const [context] = useState<ContentPartContextValue>(() => {
    const useContentPart = create<ContentPartState>(() => ({
      status: { type: "complete" },
      part: { type: "text", text },
    }));

    return {
      useContentPart,
    };
  });

  return (
    <ContentPartContext.Provider value={context}>
      {children}
    </ContentPartContext.Provider>
  );
};
