"use client";

import type { FC, PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import type { ThreadContextValue } from "../react/ThreadContext";
import { ThreadContext } from "../react/ThreadContext";
import { makeThreadViewportStore } from "../stores/ThreadViewport";
import { writableStore } from "../ReadonlyStore";
import { ThreadRuntime } from "../../api/ThreadRuntime";
import { create } from "zustand";
import { ThreadListItemRuntime } from "../../api/ThreadListItemRuntime";
import { ThreadListItemRuntimeProvider } from "./ThreadListItemRuntimeProvider";
import { ensureBinding } from "../react/utils/ensureBinding";

type ThreadProviderProps = {
  listItemRuntime: ThreadListItemRuntime;
  runtime: ThreadRuntime;
};

const useThreadRuntimeStore = (runtime: ThreadRuntime) => {
  const [store] = useState(() => create(() => runtime));

  useEffect(() => {
    ensureBinding(runtime);
    ensureBinding(runtime.composer);

    writableStore(store).setState(runtime, true);
  }, [runtime, store]);

  return store;
};

export const ThreadRuntimeProvider: FC<
  PropsWithChildren<ThreadProviderProps>
> = ({ children, listItemRuntime: threadListItemRuntime, runtime }) => {
  const useThreadRuntime = useThreadRuntimeStore(runtime);

  const [context] = useState<ThreadContextValue>(() => {
    const useViewport = makeThreadViewportStore();

    return {
      useThreadRuntime,
      useViewport,
    };
  });

  return (
    <ThreadListItemRuntimeProvider runtime={threadListItemRuntime}>
      <ThreadContext.Provider value={context}>
        {children}
      </ThreadContext.Provider>
    </ThreadListItemRuntimeProvider>
  );
};
