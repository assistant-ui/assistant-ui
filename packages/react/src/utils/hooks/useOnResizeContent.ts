import { observeContentResize } from "@assistant-ui/store/client";
import { useCallbackRef } from "radix-ui/internal";
import { useCallback } from "react";
import { useManagedRef } from "./useManagedRef";

export const useOnResizeContent = (callback: () => void) => {
  const callbackRef = useCallbackRef(callback);

  const refCallback = useCallback(
    (el: HTMLElement) => observeContentResize(el, callbackRef),
    [callbackRef],
  );

  return useManagedRef(refCallback);
};
