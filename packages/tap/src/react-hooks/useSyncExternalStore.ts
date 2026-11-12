import { useReducer } from "./useReducer";
import { useEffect } from "./useEffect";
import { useEffectEvent } from "./useEffectEvent";
import { useRef } from "./useRef";
import { getCurrentResourceFiber } from "../core/helpers/execution-context";
import { isDevelopment } from "../core/helpers/env";

let didWarnUncachedGetSnapshot = false;

const incrementUpdate = (count: number) => count + 1;

// Module scope keeps stable subscription closures separate from the V8 context containing replaceable snapshots.
const createSnapshotCheck =
  <T>(
    value: T,
    getSnapshot: () => T,
    commitCheckDepth: useRef.RefObject<number>,
  ) =>
  (): boolean => {
    try {
      if (Object.is(value, getSnapshot())) {
        commitCheckDepth.current = 0;
        return false;
      }
    } catch {
      // a throwing getSnapshot counts as changed
    }
    return true;
  };

const useSubscription = <T>(
  subscribe: (onStoreChange: () => void) => () => void,
  value: T,
  getSnapshot: () => T,
  forceUpdate: () => void,
) => {
  const commitCheckDepth = useRef(0);
  const checkForUpdates = useEffectEvent(
    createSnapshotCheck(value, getSnapshot, commitCheckDepth),
  );

  useEffect(() => {
    return subscribe(() => {
      if (checkForUpdates()) forceUpdate();
    });
  }, [subscribe, forceUpdate]);

  // Covers the tearing window between the render's getSnapshot() read and
  // the commit; only these checks count toward the loop guard.
  useEffect(() => {
    if (!checkForUpdates()) return;
    if (++commitCheckDepth.current > 50) {
      commitCheckDepth.current = 0;
      throw new Error(
        "Maximum update depth exceeded. The result of getSnapshot should be cached to avoid an infinite loop.",
      );
    }
    forceUpdate();
  }, [subscribe, value, getSnapshot, forceUpdate]);
};

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

  const [, forceUpdate] = useReducer(incrementUpdate, 0);

  useSubscription(subscribe, value, getSnapshot, forceUpdate);

  return value;
};
