import { useEffect, useRef } from "react";
import { depsShallowEqual } from "./depsShallowEqual";

export const useRenderMemo = <T>(callback: () => T, deps: unknown[]) => {
  const stateRef = useRef<{
    wipDeps: unknown[] | null;
    wip: T | null;
    currentDeps: unknown[] | null;
    current: T | null;
  }>(null);
  const state =
    stateRef.current ??
    (stateRef.current = {
      wipDeps: null,
      wip: null,
      currentDeps: null,
      current: null,
    });

  state.wipDeps = state.currentDeps;
  state.wip = state.current;

  useEffect(() => {
    state.currentDeps = state.wipDeps;
    state.current = state.wip;
  });

  if (state.currentDeps && depsShallowEqual(state.currentDeps, deps))
    return state.current as T;

  state.wipDeps = deps;
  state.wip = callback();

  return state.wip as T;
};
