"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { HistoryButtons } from "@/components/library/ui/history-buttons";

/*
 * Back and Forward between the library pages visited, like a browser's
 * history but kept here, so the buttons know whether there is anywhere to go.
 * Opening a page adds it after the current one; the buttons step along the
 * list and say so first, so the step is not recorded as a new visit.
 */

type Trail = { paths: readonly string[]; index: number };

const NO_TRAIL: Trail = { paths: [], index: -1 };

let trail = NO_TRAIL;
let pending: number | null = null;
const listeners = new Set<() => void>();

const set = (next: Trail) => {
  trail = next;
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => trail;
const serverSnapshot = () => NO_TRAIL;

/** Records where the library is each time the address changes. */
function useTrackHistory() {
  const pathname = usePathname();

  useEffect(() => {
    const { paths, index } = trail;
    const target = pending;
    pending = null;
    if (target !== null && paths[target] === pathname) {
      set({ paths, index: target });
    } else if (target === null && paths[index - 1] === pathname) {
      set({ paths, index: index - 1 });
    } else if (target === null && paths[index + 1] === pathname) {
      set({ paths, index: index + 1 });
    } else if (paths[index] !== pathname) {
      set({
        paths: [...paths.slice(0, index + 1), pathname],
        index: index + 1,
      });
    }
  }, [pathname]);
}

/** The History Buttons, wired to the library pages visited. */
export function LibraryHistoryButtons() {
  useTrackHistory();
  const router = useRouter();
  const { paths, index } = useSyncExternalStore(
    subscribe,
    snapshot,
    serverSnapshot,
  );

  const go = (step: -1 | 1) => {
    const path = paths[index + step];
    if (path === undefined) return;
    pending = index + step;
    router.push(path);
  };

  return (
    <HistoryButtons
      canGoBack={index > 0}
      canGoForward={index < paths.length - 1}
      onBack={() => go(-1)}
      onForward={() => go(1)}
    />
  );
}
