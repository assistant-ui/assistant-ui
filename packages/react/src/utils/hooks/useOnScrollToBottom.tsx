import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import { useEffect } from "react";
import { useThreadViewportStore } from "../../context/react/ThreadContext";

export const useOnScrollToBottom = (callback: () => void) => {
  const callbackRef = useCallbackRef(callback);
  const threadViewportStore = useThreadViewportStore();

  useEffect(() => {
    return threadViewportStore.getState().onScrollToBottom(() => {
      callbackRef();
    });
  }, [threadViewportStore, callbackRef]);
};
