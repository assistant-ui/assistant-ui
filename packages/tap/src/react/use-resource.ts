import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ExtractResourceOutput, ResourceElement } from "../core/types";
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
): ExtractResourceOutput<E> {
  const [, rerender] = useState({});
  const fiber = useMemo(
    () => createResourceFiber(element.type, () => rerender({})),
    [element.type],
  );

  const result = renderResourceFiber(fiber, element.props);
  useIsomorphicLayoutEffect(() => {
    return () => unmountResourceFiber(fiber);
  }, [fiber]);
  useIsomorphicLayoutEffect(() => {
    commitResourceFiber(fiber, result);
  });

  return result.state;
}
