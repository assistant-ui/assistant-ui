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
    // changed and forces a re-render, so the render-time read surfaces the
    // error instead of silently keeping the committed value
    try {
      if (Object.is(value, getSnapshot())) return;
    } catch {
      // fall through to forceUpdate
    }
    forceUpdate((c) => c + 1);
  });

  useEffect(() => {
    onStoreChange();
    return subscribe(onStoreChange);
  }, [subscribe]);

  return value;
};
