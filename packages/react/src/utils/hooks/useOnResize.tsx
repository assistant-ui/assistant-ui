import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import { useCallback } from "react";
import { useManagedRef } from "./useManagedRef";

export const useOnResize = (callback: () => void) => {
  const callbackRef = useCallbackRef(callback);

  const refCallback = useCallback(
    (el: HTMLElement) => {
      const resizeObserver = new ResizeObserver(() => {
        callbackRef();
      });

      resizeObserver.observe(el);

      return () => {
        resizeObserver.disconnect();
      };
    },
    [callbackRef],
  );

  return useManagedRef(refCallback);
};
