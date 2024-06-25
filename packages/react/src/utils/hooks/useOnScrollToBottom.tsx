import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import { useEffect } from "react";
import { useThreadContext } from "../../context/react/ThreadContext";

export const useOnScrollToBottom = (callback: () => void) => {
  const callbackRef = useCallbackRef(callback);

  const { useViewport } = useThreadContext();
  useEffect(() => {
    return useViewport.getState().onScrollToBottom(() => {
      callbackRef();
    });
  }, [useViewport, callbackRef]);
};
