import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";

const subscribeNever = () => () => {};

export const useIsServerRender = () =>
  useSyncExternalStore(
    subscribeNever,
    () => false,
    () => typeof document === "undefined",
  );

export const useIsomorphicLayoutEffect: typeof useLayoutEffect = (
  effect,
  deps,
) => {
  const useEffectImpl = useIsServerRender() ? useEffect : useLayoutEffect;
  useEffectImpl(effect, deps);
};
