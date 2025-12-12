import { ExtractResourceOutput, ResourceElement } from "../core/types";
import { tapEffect } from "./tap-effect";
import {
  createResourceFiber,
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";
import { tapMemo } from "./tap-memo";
import { tapState } from "./tap-state";

export function tapResource<E extends ResourceElement<any, any>>(
  element: E,
): ExtractResourceOutput<E>;
export function tapResource<E extends ResourceElement<any, any>>(
  element: E,
  deps: readonly unknown[],
): ExtractResourceOutput<E>;
export function tapResource<E extends ResourceElement<any, any>>(
  element: E,
  deps?: readonly unknown[],
): ExtractResourceOutput<E> {
  const [stateVersion, rerender] = tapState({});
  const fiber = tapMemo(
    () => createResourceFiber(element.type, () => rerender({})),
    [element.type],
  );

  const props = deps ? tapMemo(() => element.props, deps) : element.props;
  const result = tapMemo(
    () => renderResourceFiber(fiber, props),
    [fiber, props, stateVersion],
  );

  tapEffect(() => {
    return () => unmountResourceFiber(fiber);
  }, [fiber]);

  tapEffect(() => {
    commitResourceFiber(fiber, result);
  }, [fiber, result]);

  return result.state;
}
