import { useCallback, useRef } from "react";

export const useManagedRef = <TNode>(
  callback: (node: TNode) => (() => void) | undefined,
) => {
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  const ref = useCallback(
    (el: TNode | null) => {
      // Call the previous cleanup function
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = undefined;
      }

      // Call the new callback and store its cleanup function
      if (el) {
        cleanupRef.current = callback(el);
      }
    },
    [callback],
  );

  return ref;
};
