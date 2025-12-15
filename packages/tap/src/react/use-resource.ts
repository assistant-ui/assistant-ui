import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ExtractResourceReturnType, ResourceElement } from "../core/types";
import {
  createResourceFiber,
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";
import { isDevelopment } from "../core/env";

const shouldAvoidLayoutEffect =
  (globalThis as any).__ASSISTANT_UI_DISABLE_LAYOUT_EFFECT__ === true;

const useDevStrictMode = () => {
  if (!isDevelopment) return null;

  const count = useRef(0);
  const isFirstRender = count.current === 0;
  useState(() => count.current++);
  if (count.current !== 2) return null;
  return isFirstRender ? ("child" as const) : ("root" as const);
};

const useIsomorphicLayoutEffect = shouldAvoidLayoutEffect
  ? useEffect
  : useLayoutEffect;

export function useResource<E extends ResourceElement<any, any>>(
  element: E,
): ExtractResourceReturnType<E> {
  const [, rerender] = useState({});

  const devStrictMode = useDevStrictMode();

  // biome-ignore lint/correctness/useExhaustiveDependencies: user provided deps instead of prop identity
  const fiber = useMemo(() => {
    return createResourceFiber(element.type, () => rerender({}), devStrictMode);
  }, [element.type, element.key]);

  const result = renderResourceFiber(fiber, element.props);
  useIsomorphicLayoutEffect(() => {
    return () => unmountResourceFiber(fiber);
  }, [fiber]);
  useIsomorphicLayoutEffect(() => {
    commitResourceFiber(fiber, result);
  });

  return result.output;
}
