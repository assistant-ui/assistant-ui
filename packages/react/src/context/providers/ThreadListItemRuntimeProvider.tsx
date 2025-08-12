"use client";

import { type FC, type PropsWithChildren, useEffect, useState } from "react";
import { create } from "zustand";
import {
  ThreadListItemContext,
  type ThreadListItemContextValue,
} from "../react/ThreadListItemContext";
import { writableStore } from "../ReadonlyStore";
import { ThreadListItemRuntime } from "../../api/ThreadListItemRuntime";
import { ensureBinding } from "../react/utils/ensureBinding";
import { AssistantClientState } from "../../client/AssistantClient";

export namespace ThreadListItemProvider {
  export type Props = PropsWithChildren<{
    idSelector: (state: AssistantClientState) => string;
  }>;
}

const useThreadListItemRuntimeStore = (runtime: ThreadListItemRuntime) => {
  const [store] = useState(() => create(() => runtime));

  useEffect(() => {
    ensureBinding(runtime);
    writableStore(store).setState(runtime, true);
  }, [runtime, store]);

  return store;
};

export const ThreadListItemProvider: FC<ThreadListItemProvider.Props> = ({
  idSelector,
  children,
}) => {
  const assistantActions = useAssistantActions();
  const useThreadListItemRuntime = useThreadListItemRuntimeStore(idSelector);
  const [context] = useState<ThreadListItemContextValue>(() => {
    return { useThreadListItemRuntime };
  });

  return (
    <ThreadListItemContext.Provider value={context}>
      {children}
    </ThreadListItemContext.Provider>
  );
};
