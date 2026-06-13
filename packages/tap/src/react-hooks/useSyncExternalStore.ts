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
    if (!Object.is(value, getSnapshot())) forceUpdate((c) => c + 1);
  });

  useEffect(() => {
    onStoreChange();
    return subscribe(onStoreChange);
  }, [subscribe]);

  return value;
};
