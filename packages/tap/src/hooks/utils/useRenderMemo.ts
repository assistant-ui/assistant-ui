import { useState, useEffect } from "react";
import { depsShallowEqual } from "./depsShallowEqual";

export const useRenderMemo = <T>(callback: () => T, deps: unknown[]) => {
  const [state] = useState(() => ({
    wipDeps: null as unknown[] | null,
    wip: null as T,
    currentDeps: null as unknown[] | null,
    current: null as T,
  }));

  state.wipDeps = state.currentDeps;
  state.wip = state.current;

  useEffect(() => {
    state.currentDeps = state.wipDeps;
    state.current = state.wip;
  });

  if (state.currentDeps && depsShallowEqual(state.currentDeps, deps))
    return state.current;

  state.wipDeps = deps;
  state.wip = callback();

  return state.wip;
};
