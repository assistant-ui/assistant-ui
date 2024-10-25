"use client";

import { type FC, type PropsWithChildren, useEffect, useState } from "react";
import { create } from "zustand";
import { ContentPartContext } from "../react/ContentPartContext";
import type { ContentPartContextValue } from "../react/ContentPartContext";
import { writableStore } from "../ReadonlyStore";
import { ContentPartRuntime } from "../../api/ContentPartRuntime";

type ContentPartProviderProps = PropsWithChildren<{
  runtime: ContentPartRuntime;
}>;

const useContentPartRuntimeStore = (runtime: ContentPartRuntime) => {
  const [store] = useState(() => create(() => runtime));

  useEffect(() => {
    writableStore(store).setState(runtime, true);
  }, [runtime, store]);

  return store;
};

export const useContentPartStore = (runtime: ContentPartRuntime) => {
  const [store] = useState(() => create(() => runtime.getState()));
  useEffect(() => {
    const updateState = () =>
      writableStore(store).setState(runtime.getState(), true);
    updateState();
    return runtime.subscribe(updateState);
  }, [runtime, store]);

  return store;
};

export const ContentPartRuntimeProvider: FC<ContentPartProviderProps> = ({
  runtime,
  children,
}) => {
  const useContentPartRuntime = useContentPartRuntimeStore(runtime);
  const useContentPart = useContentPartStore(runtime);
  const [context] = useState<ContentPartContextValue>(() => {
    return { useContentPartRuntime, useContentPart };
  });

  return (
    <ContentPartContext.Provider value={context}>
      {children}
    </ContentPartContext.Provider>
  );
};
