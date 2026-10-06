import { useEffect, useRef } from "react";
import { depsShallowEqual } from "./depsShallowEqual";

export const useRenderMemo = <T>(
  callback: () => T,
  deps: unknown[],
  disableMemo: boolean,
) => {
  const stateRef = useRef<{
    currentDeps: unknown[] | null;
    current: T | null;
  }>(null);
  const state =
    stateRef.current ??
    (stateRef.current = {
      currentDeps: null,
      current: null,
    });

  const value =
    !disableMemo &&
    state.currentDeps &&
    depsShallowEqual(state.currentDeps, deps)
      ? (state.current as T)
      : callback();

  useEffect(() => {
    state.currentDeps = deps;
    state.current = value;
  });

  return value;
};
