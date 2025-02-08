import { useCallback, useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === "undefined") return () => {};
      const mediaQueryList = window.matchMedia(query);

      if (mediaQueryList.addEventListener) {
        mediaQueryList.addEventListener("change", callback);
      } else {
        mediaQueryList.addListener(callback);
      }

      return () => {
        if (mediaQueryList.removeEventListener) {
          mediaQueryList.removeEventListener("change", callback);
        } else {
          mediaQueryList.removeListener(callback);
        }
      };
    },
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
