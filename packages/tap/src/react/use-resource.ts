import { useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import type { ExtractResourceReturnType, ResourceElement } from "../core/types";
import {
  createResourceFiber,
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";
import { isDevelopment } from "../core/env";

const useDevStrictMode = () => {
  if (!isDevelopment) return null;

  const count = useRef(0);
  const isFirstRender = count.current === 0;
  useState(() => count.current++);
  if (count.current !== 2) return null;
  return isFirstRender ? ("child" as const) : ("root" as const);
};

const resourceReducer = (version: number, callback: () => boolean) => {
  return version + (callback() ? 1 : 0);
};

export function useResource<E extends ResourceElement<any, any>>(
  element: E,
): ExtractResourceReturnType<E> {
  const [, dispatch] = useReducer(resourceReducer, 0);

  const devStrictMode = useDevStrictMode();

  // biome-ignore lint/correctness/useExhaustiveDependencies: user provided deps instead of prop identity
  const fiber = useMemo(() => {
    return createResourceFiber(element.type, dispatch, devStrictMode);
  }, [element.type, element.key]);

  const result = renderResourceFiber(fiber, element.props);
  useLayoutEffect(() => {
    return () => unmountResourceFiber(fiber);
  }, [fiber]);
  useLayoutEffect(() => {
    commitResourceFiber(fiber, result);
  });

  return result.output;
}
