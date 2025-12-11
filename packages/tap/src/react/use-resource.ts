import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { ExtractResourceReturnType, ResourceElement } from "../core/types";
import {
  createResourceFiber,
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";

const shouldAvoidLayoutEffect =
  (globalThis as any).__ASSISTANT_UI_DISABLE_LAYOUT_EFFECT__ === true;

const useIsomorphicLayoutEffect = shouldAvoidLayoutEffect
  ? useEffect
  : useLayoutEffect;

export function useResource<E extends ResourceElement<any, any>>(
  element: E,
): ExtractResourceReturnType<E> {
  const [, rerender] = useState({});

  const fiber = useMemo(() => {
    void element.key; // rerender on key change

    return createResourceFiber(element.type, () => rerender({}));
  }, [element.type, element.key]);

  const result = renderResourceFiber(fiber, element.props);
  useIsomorphicLayoutEffect(() => {
    return () => unmountResourceFiber(fiber);
  }, [fiber]);
  useIsomorphicLayoutEffect(() => {
    commitResourceFiber(fiber, result);
  });

  return result.state;
}
