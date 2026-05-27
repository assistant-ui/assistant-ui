import { useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import type {
  ResourceFiberRoot,
  ExtractResourceReturnType,
  ResourceElement,
} from "../core/types";
import {
  createResourceFiber,
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";
import { isDevelopment } from "../core/helpers/env";
import {
  commitRoot,
  createResourceFiberRoot,
  setRootVersion,
} from "../core/helpers/root";

const useDevStrictMode = () => {
  if (!isDevelopment) return null;

  // oxlint-disable-next-line react-hooks/rules-of-hooks -- isDevelopment is a build-time constant, so this branch is stable per build
  const count = useRef(0);
  const isFirstRender = count.current === 0;
  // oxlint-disable-next-line react-hooks/rules-of-hooks -- isDevelopment is a build-time constant, so this branch is stable per build
  useState(() => count.current++);
  if (count.current !== 2) return null;
  return isFirstRender ? ("child" as const) : ("root" as const);
};

export function useResource<E extends ResourceElement<any, any>>(
  element: E,
): ExtractResourceReturnType<E> {
  const root = useMemo<ResourceFiberRoot>(() => {
    return createResourceFiberRoot((cb) => dispatch(cb));
  }, []);

  const [version, dispatch] = useReducer((v: number, cb: () => boolean) => {
    setRootVersion(root, v);
    return v + (cb() ? 1 : 0);
  }, 0);
  setRootVersion(root, version);

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
