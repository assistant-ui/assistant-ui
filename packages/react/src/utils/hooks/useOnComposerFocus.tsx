import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import { useEffect } from "react";
import { useThreadContext } from "../../context/react/ThreadContext";

export const useOnComposerFocus = (callback: () => void) => {
  const callbackRef = useCallbackRef(callback);

  const { useComposer } = useThreadContext();
  useEffect(() => {
    return useComposer.getState().onFocus(() => {
      callbackRef();
    });
  }, [useComposer, callbackRef]);
};
