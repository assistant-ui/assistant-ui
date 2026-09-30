import type {
  ExtractResourceReturnType,
  ResourceElement,
  ResourceFiber,
} from "../core/types";
import {
  renderResourceFiber,
  commitResourceFiber,
  unmountResourceFiber,
} from "../core/ResourceFiber";
import { hasContextDepsChanged } from "../core/context";
import {
  useHostLifecycle,
  useResourceFiberHost,
} from "./utils/useResourceFiberHostUtils";
import { useEffect, useMemo, useRef } from "react";
import { depsShallowEqual } from "./utils/depsShallowEqual";

type HostState<R> = {
  fiber: ResourceFiber<R>;
  key: string | number | undefined;
  currentDeps: readonly unknown[] | null;
  current: { value: R } | null;
  wipDeps: readonly unknown[] | null;
  wip: { value: R } | null;
};

const createHostState = <R>(
  fiber: ResourceFiber<R>,
  key: string | number | undefined,
): HostState<R> => ({
  fiber,
  key,
  currentDeps: null,
  current: null,
  wipDeps: null,
  wip: null,
});

export function useResource<E extends ResourceElement<any>>(
  element: E,
): ExtractResourceReturnType<E> {
  const { version, createFiber } = useResourceFiberHost();
  const stateRef = useRef<HostState<ExtractResourceReturnType<E>>>(null);
  const state = (stateRef.current ??= createHostState(
    createFiber(element.hook, element.key),
    element.key,
  ));
  const fiber = useMemo(
    () =>
      state.fiber.hook === element.hook &&
      state.key === element.key &&
      !state.fiber.isReleased
        ? state.fiber
        : createFiber(element.hook, element.key),
    [state, element.hook, element.key, createFiber],
  );

  state.wipDeps = state.currentDeps;
  state.wip = state.current;
  const deps = [fiber, version, element.args];
  if (
    hasContextDepsChanged(fiber) ||
    state.currentDeps === null ||
    !depsShallowEqual(state.currentDeps, deps)
  ) {
    state.wipDeps = deps;
    state.wip = { value: renderResourceFiber(fiber, element.args) };
  }
  const result = state.wip!;

  const cell = useHostLifecycle(fiber);
  useEffect(() => {
    state.currentDeps = state.wipDeps;
    state.current = state.wip;
    state.fiber = fiber;
    state.key = element.key;
    commitResourceFiber(fiber);
    if (cell !== null) {
      return () => {
        if (cell.fiber !== fiber) unmountResourceFiber(fiber, true);
      };
    }
    return undefined;
  }, [state, cell, fiber, element.key, result]);

  return result.value;
}
