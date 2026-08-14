import { useReducer } from "./useReducer";
import { useEffect } from "./useEffect";
import { useEffectEvent } from "./useEffectEvent";
import { getCurrentResourceFiber } from "../core/helpers/execution-context";
import { isDevelopment } from "../core/helpers/env";

let didWarnUncachedGetSnapshot = false;

export const useSyncExternalStore = <T>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => T,
  getServerSnapshot: () => T = getSnapshot,
): T => {
  const isNeverMounted = getCurrentResourceFiber().isNeverMounted;
  const value = isNeverMounted ? getServerSnapshot() : getSnapshot();

  if (
    isDevelopment &&
    !didWarnUncachedGetSnapshot &&
    (!isNeverMounted || getServerSnapshot === getSnapshot)
  ) {
    if (!Object.is(value, getSnapshot())) {
      didWarnUncachedGetSnapshot = true;
      console.error(
        "The result of getSnapshot should be cached to avoid an infinite loop",
      );
    }
  }

  const [, forceUpdate] = useReducer((c: number) => c + 1, 0);

  const onStoreChange = useEffectEvent(() => {
    try {
      if (Object.is(value, getSnapshot())) return;
    } catch {
      // fall through to forceUpdate
    }
    forceUpdate();
  });

  useEffect(() => subscribe(onStoreChange), [subscribe]);

  // Runs after every (re)subscription and after commits where the snapshot
  // inputs changed, covering the tearing window where the store mutates
  // between the render's getSnapshot() read and the commit.
  useEffect(() => {
    onStoreChange();
  }, [subscribe, value, getSnapshot]);

  return value;
};
