"use client";

import { useCallback, useSyncExternalStore } from "react";

const getServerSnapshot = () => false;
const noopUnsubscribe = () => {};

export const useMediaQuery = (query: string | null): boolean => {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === "undefined" || query === null)
        return noopUnsubscribe;
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined" || query === null) return false;
    return window.matchMedia(query).matches;
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
