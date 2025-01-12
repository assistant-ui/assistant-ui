import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import { useCallback } from "react";
import { useManagedRef } from "./useManagedRef";

export const useOnResizeContent = (callback: () => void) => {
  const callbackRef = useCallbackRef(callback);

  const refCallback = useCallback(
    (el: HTMLElement) => {
      const resizeObserver = new ResizeObserver(() => {
        callbackRef();
      });

      const mutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node instanceof Element) {
              resizeObserver.observe(node);
            }
          }

          for (const node of mutation.removedNodes) {
            if (node instanceof Element) {
              resizeObserver.unobserve(node);
            }
          }
        }

        callbackRef();
      });

      resizeObserver.observe(el);
      mutationObserver.observe(el, { childList: true });

      // Observe existing children
      for (const child of el.children) {
        resizeObserver.observe(child);
      }

      return () => {
        resizeObserver.disconnect();
        mutationObserver.disconnect();
      };
    },
    [callbackRef],
  );

  return useManagedRef(refCallback);
};
