import { createContext, useContext } from "react";
import { useContextProvider } from "@assistant-ui/tap";
import type { Unsubscribe } from "../../types/unsubscribe";

export type ThreadRunStartBridge = {
  emit: (threadId: string) => void;
  subscribe: (callback: (threadId: string) => void) => Unsubscribe;
};

export const createThreadRunStartBridge = (): ThreadRunStartBridge => {
  const callbacks = new Set<(threadId: string) => void>();

  return {
    emit(threadId) {
      for (const callback of callbacks) callback(threadId);
    },
    subscribe(callback) {
      callbacks.add(callback);
      return () => callbacks.delete(callback);
    },
  };
};

const ThreadRunStartBridgeContext = createContext<ThreadRunStartBridge | null>(
  null,
);

export const useThreadRunStartBridgeProvider = <T>(
  bridge: ThreadRunStartBridge,
  fn: () => T,
): T => useContextProvider(ThreadRunStartBridgeContext, bridge, fn);

export const useThreadRunStartBridge = () =>
  useContext(ThreadRunStartBridgeContext);
