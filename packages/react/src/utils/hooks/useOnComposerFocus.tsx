import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import { useEffect } from "react";
import { useThreadComposerStore } from "../../context/react/ThreadContext";

export const useOnComposerFocus = (callback: () => void) => {
  const callbackRef = useCallbackRef(callback);

  const threadComposerStore = useThreadComposerStore();
  useEffect(() => {
    return threadComposerStore.getState().onFocus(() => {
      callbackRef();
    });
  }, [threadComposerStore, callbackRef]);
};
