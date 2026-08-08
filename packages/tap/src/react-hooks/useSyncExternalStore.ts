import { useState } from "./useState";
import { useEffect } from "./useEffect";
import { useEffectEvent } from "./useEffectEvent";
import { useRef } from "./useRef";

export const useSyncExternalStore = <T>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => T,
  getServerSnapshot: () => T = getSnapshot,
): T => {
  const isFirstRender = useRef(true);
  const value = isFirstRender.current ? getServerSnapshot() : getSnapshot();
  isFirstRender.current = false;

  const [, forceUpdate] = useState(0);

  const onStoreChange = useEffectEvent(() => {
    // mirrors React's checkIfSnapshotChanged: a throwing snapshot counts as
    // changed. The error must not escape here (a notification-time throw exits
    // through the scheduler flush, which is an uncaughtException on the
    // macrotask path); the forced re-render's own read surfaces it in render.
    try {
      if (Object.is(value, getSnapshot())) return;
    } catch {
      // intentional: fall through to the re-render
    }
    forceUpdate((c) => c + 1);
  });

  useEffect(() => {
    onStoreChange();
    return subscribe(onStoreChange);
  }, [subscribe]);

  return value;
};
