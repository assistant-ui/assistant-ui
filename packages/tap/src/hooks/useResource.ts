import type { ExtractResourceReturnType, ResourceElement } from "../core/types";
import {
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";
import { useResourceFiberHost } from "./utils/useResourceFiberHostUtils";
import { useEffect, useMemo } from "react";

export function useResource<E extends ResourceElement<any, any[]>>(
  element: E,
): ExtractResourceReturnType<E>;
export function useResource<E extends ResourceElement<any, any[]>>(
  element: E,
  argsDeps: readonly unknown[],
): ExtractResourceReturnType<E>;
export function useResource<E extends ResourceElement<any, any[]>>(
  element: E,
  argsDeps?: readonly unknown[],
): ExtractResourceReturnType<E> {
  const { version, createFiber } = useResourceFiberHost();
  const fiber = useMemo(() => {
    void element.key;
    return createFiber(element.hook);
  }, [element.hook, element.key, createFiber]);

  const result = argsDeps
    ? // oxlint-disable-next-line react/rules-of-hooks -- argsDeps presence is fixed per call site, so the conditional call order is stable
      useMemo(
        () => renderResourceFiber(fiber, element.args),
        // oxlint-disable-next-line react/exhaustive-deps -- args identity replaced by user-provided deps
        [fiber, ...argsDeps, version],
      )
    : renderResourceFiber(fiber, element.args);

  useEffect(() => () => unmountResourceFiber(fiber), [fiber]);
  useEffect(() => {
    commitResourceFiber(fiber, result);
  }, [fiber, result]);

  return result.output;
}
