import { useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  ResourceFiberRoot,
  type ExtractResourceReturnType,
  type ResourceElement,
} from "../core/types";
import {
  createResourceFiber,
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";
import { isDevelopment } from "../core/helpers/env";
import { commitRoot, resetRoot } from "../core/helpers/root";

const useDevStrictMode = () => {
  if (!isDevelopment) return null;

  const count = useRef(0);
  const isFirstRender = count.current === 0;
  useState(() => count.current++);
  if (count.current !== 2) return null;
  return isFirstRender ? ("child" as const) : ("root" as const);
};

export function useResource<E extends ResourceElement<any, any>>(
  element: E,
): ExtractResourceReturnType<E> {
  const root = useMemo<ResourceFiberRoot>(() => {
    return {
      dispatchUpdate: (cb) => dispatch(cb),
      dirtyCells: [],
    };
  }, []);

  resetRoot(root);
  const [, dispatch] = useReducer(
    (v: number, cb: () => boolean) => v + (cb() ? 1 : 0),
    0,
  );

  const devStrictMode = useDevStrictMode();
  const fiber = useMemo(() => {
    void element.key;
    return createResourceFiber(element.type, root, undefined, devStrictMode);
  }, [element.type, element.key, root, devStrictMode]);

  const result = renderResourceFiber(fiber, element.props);
  useLayoutEffect(() => {
    return () => unmountResourceFiber(fiber);
  }, [fiber]);
  useLayoutEffect(() => {
    commitRoot(root);
    commitResourceFiber(fiber, result);
  });

  return result.output;
}
