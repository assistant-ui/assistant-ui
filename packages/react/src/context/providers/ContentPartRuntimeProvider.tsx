"use client";

import { type FC, type PropsWithChildren, useEffect, useState } from "react";
import { create } from "zustand";
import { ContentPartContext } from "../react/ContentPartContext";
import type { ContentPartContextValue } from "../react/ContentPartContext";
import { writableStore } from "../ReadonlyStore";
import { ContentPartRuntime } from "../../api/ContentPartRuntime";
import { ensureBinding } from "../react/utils/ensureBinding";

export namespace ContentPartRuntimeProvider {
  export type Props = PropsWithChildren<{
    runtime: ContentPartRuntime;
  }>;
}

const useContentPartRuntimeStore = (runtime: ContentPartRuntime) => {
  const [store] = useState(() => create(() => runtime));

  useEffect(() => {
    ensureBinding(runtime);

    writableStore(store).setState(runtime, true);
  }, [runtime, store]);

  return store;
};

export const ContentPartRuntimeProvider: FC<
  ContentPartRuntimeProvider.Props
> = ({ runtime, children }) => {
  const useContentPartRuntime = useContentPartRuntimeStore(runtime);
  const [context] = useState<ContentPartContextValue>(() => {
    return { useContentPartRuntime };
  });

  return (
    <ContentPartContext.Provider value={context}>
      {children}
    </ContentPartContext.Provider>
  );
};
