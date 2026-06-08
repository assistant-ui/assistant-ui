import type { ExtractResourceReturnType, ResourceElement } from "../core/types";
import { useEffect } from "./useEffect";
import {
  createResourceFiber,
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";
import { useMemo } from "./useMemo";
import { useRef } from "./useRef";
import { getCurrentResourceFiber } from "../core/helpers/execution-context";

export function useResource<E extends ResourceElement<any, any>>(
  element: E,
): ExtractResourceReturnType<E>;
export function useResource<E extends ResourceElement<any, any>>(
  element: E,
  propsDeps: readonly unknown[],
): ExtractResourceReturnType<E>;
export function useResource<E extends ResourceElement<any, any>>(
  element: E,
  propsDeps?: readonly unknown[],
): ExtractResourceReturnType<E> {
  const parentFiber = getCurrentResourceFiber();
  const versionRef = useRef(0);
  const fiber = useMemo(() => {
    void element.key;
    return createResourceFiber(element.type, parentFiber.root, () => {
      versionRef.current++;
      parentFiber.markDirty?.();
    });
  }, [element.type, element.key, parentFiber]);

  const result = propsDeps
    ? // oxlint-disable-next-line react-hooks/rules-of-hooks -- propsDeps presence is fixed per call site, so the conditional call order is stable
      useMemo(
        () => renderResourceFiber(fiber, element.props),
        // oxlint-disable-next-line react/exhaustive-deps -- props identity replaced by user-provided deps
        [fiber, ...propsDeps, versionRef.current],
      )
    : renderResourceFiber(fiber, element.props);

  useEffect(() => () => unmountResourceFiber(fiber), [fiber]);
  useEffect(() => {
    commitResourceFiber(fiber, result);
  }, [fiber, result]);

  return result.output;
}
