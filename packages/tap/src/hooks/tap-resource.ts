import { ExtractResourceReturnType, ResourceElement } from "../core/types";
import { tapEffect } from "./tap-effect";
import {
  createResourceFiber,
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";
import { tapMemo } from "./tap-memo";
import { tapRef } from "./tap-ref";
import { getCurrentResourceFiber } from "../core/helpers/execution-context";

export function tapResource<E extends ResourceElement<any, any>>(
  element: E,
): ExtractResourceReturnType<E>;
export function tapResource<E extends ResourceElement<any, any>>(
  element: E,
  propsDeps: readonly unknown[],
): ExtractResourceReturnType<E>;
export function tapResource<E extends ResourceElement<any, any>>(
  element: E,
  propsDeps?: readonly unknown[],
): ExtractResourceReturnType<E> {
  const parentFiber = getCurrentResourceFiber();
  const versionRef = tapRef(0);
  const fiber = tapMemo(() => {
    void element.key;
    return createResourceFiber(element.type, parentFiber.root, () => {
      versionRef.current++;
      parentFiber.markDirty?.();
    });
  }, [element.type, element.key, parentFiber]);

  const result = propsDeps
    ? // biome-ignore lint/correctness/useExhaustiveDependencies: user provided deps instead of prop identity
      tapMemo(
        () => renderResourceFiber(fiber, element.props),
        [fiber, ...propsDeps, versionRef.current],
      )
    : renderResourceFiber(fiber, element.props);

  tapEffect(() => () => unmountResourceFiber(fiber), [fiber]);
  tapEffect(() => {
    commitResourceFiber(fiber, result);
  }, [fiber, result]);

  return result.output;
}
