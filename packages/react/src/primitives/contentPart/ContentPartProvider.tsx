"use client";

import { type FC, type PropsWithChildren, useMemo, useState } from "react";
import { create } from "zustand";
import type { ThreadMessage } from "../../utils/context/stores/AssistantTypes";
import type {
  ContentPartState,
  ContentPartStore,
} from "../../utils/context/stores/ContentPartTypes";
import { ContentPartContext } from "../../utils/context/useContentPartContext";

type ContentPartProviderProps = PropsWithChildren<{
  part: ThreadMessage["content"][number];
  isLoading: boolean;
}>;

const useContentPartContext = () => {
  const [context] = useState<ContentPartStore>(() => {
    const useContentPart = create<ContentPartState>(() => ({
      part: null as unknown as ThreadMessage["content"][number],
      isLoading: false,
    }));

    return { useContentPart };
  });
  return context;
};

export const ContentPartProvider: FC<ContentPartProviderProps> = ({
  part,
  isLoading,
  children,
}) => {
  const context = useContentPartContext();

  // sync useContentPart
  useMemo(() => {
    context.useContentPart.setState(
      {
        part,
        isLoading,
      },
      true,
    );
  }, [context, part, isLoading]);

  return (
    <ContentPartContext.Provider value={context}>
      {children}
    </ContentPartContext.Provider>
  );
};
