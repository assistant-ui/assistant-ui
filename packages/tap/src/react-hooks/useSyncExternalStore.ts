import { useReducer } from "./useReducer";
import { useEffect } from "./useEffect";
import { useEffectEvent } from "./useEffectEvent";
import { getCurrentResourceFiber } from "../core/helpers/execution-context";

export const useSyncExternalStore = <T>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => T,
  getServerSnapshot: () => T = getSnapshot,
): T => {
  const value = getCurrentResourceFiber().isNeverMounted
    ? getServerSnapshot()
    : getSnapshot();

  const [, forceUpdate] = useReducer((c: number) => c + 1, 0);

  const onStoreChange = useEffectEvent(() => {
    try {
      if (Object.is(value, getSnapshot())) return;
    } catch {
      // fall through to forceUpdate
    }
    forceUpdate();
  });

  useEffect(() => {
    const unsubscribe = subscribe(onStoreChange);
    onStoreChange();
    return unsubscribe;
  }, [subscribe]);

  // Covers the tearing window where the store mutates between the render's
  // getSnapshot() read and the commit, with no notification afterward.
  useEffect(() => {
    onStoreChange();
  }, [subscribe, value, getSnapshot]);

  return value;
};
