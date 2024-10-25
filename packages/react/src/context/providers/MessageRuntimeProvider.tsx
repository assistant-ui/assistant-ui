"use client";

import { type FC, type PropsWithChildren, useEffect, useState } from "react";
import { create } from "zustand";
import { MessageContext } from "../react/MessageContext";
import type { MessageContextValue } from "../react/MessageContext";
import { makeMessageUtilsStore } from "../stores/MessageUtils";
import { ReadonlyStore, writableStore } from "../ReadonlyStore";
import { MessageRuntime } from "../../api/MessageRuntime";

type MessageProviderProps = PropsWithChildren<{
  runtime: MessageRuntime;
}>;

const useMessageRuntimeStore = (runtime: MessageRuntime) => {
  const [store] = useState(() => create(() => runtime));

  useEffect(() => {
    writableStore(store).setState(runtime, true);
  }, [runtime, store]);

  return store;
};

const useMessageStore = (runtime: MessageRuntime) => {
  const [store] = useState(() => create(() => runtime.getState()));
  useEffect(() => {
    const updateState = () =>
      writableStore(store).setState(runtime.getState(), true);
    updateState();
    return runtime.subscribe(updateState);
  }, [runtime, store]);

  return store;
};

const useMessageUtilsStore = () => {
  const [store] = useState(() => makeMessageUtilsStore());
  return store;
};

const useEditComposerStore = (
  useMessageRuntime: ReadonlyStore<MessageRuntime>,
) => {
  const runtime = useMessageRuntime.getState().composer;
  const [store] = useState(() => create(() => runtime.getState()));

  useEffect(() => {
    const updateState = () => writableStore(store).setState(runtime.getState());
    updateState();
    return runtime.subscribe(updateState);
  }, [runtime, store]);

  return store;
};

export const MessageRuntimeProvider: FC<MessageProviderProps> = ({
  runtime,
  children,
}) => {
  const useMessageRuntime = useMessageRuntimeStore(runtime);
  const useMessage = useMessageStore(runtime);
  const useMessageUtils = useMessageUtilsStore();
  const useEditComposer = useEditComposerStore(useMessageRuntime);
  const [context] = useState<MessageContextValue>(() => {
    return { useMessageRuntime, useMessage, useMessageUtils, useEditComposer };
  });

  return (
    <MessageContext.Provider value={context}>
      {children}
    </MessageContext.Provider>
  );
};
