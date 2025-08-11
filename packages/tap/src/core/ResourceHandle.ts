import { ResourceElement, Unsubscribe } from "./types";
import {
  createResourceFiber,
  unmountResource,
  renderResource,
  commitResource,
} from "./ResourceFiber";
import { UpdateScheduler } from "./scheduler";
import { tapResource } from "../hooks/tap-resource";
import { tapRef } from "../hooks/tap-ref";
import { tapEffect } from "../hooks/tap-effect";
import { tapState } from "../hooks/tap-state";
import { tapMemo } from "../hooks/tap-memo";

export interface ResourceHandle<R, P> {
  getState(): R;
  subscribe(callback: () => void): Unsubscribe;
  updateInput(props: P): void;
  dispose(): void;
}

const HandleWrapperResource = <R, P>({
  element,
  onDispose,
}: {
  element: ResourceElement<R, P>;
  onDispose: () => void;
}): ResourceHandle<R, P> => {
  const [props, setProps] = tapState(element.props);
  const value = tapResource({ type: element.type, props });
  const subscribers = tapRef(new Set<() => void>()).current;
  const valueRef = tapRef(value);

  tapEffect(() => {
    if (value !== valueRef.current) {
      valueRef.current = value;
      subscribers.forEach((callback) => callback());
    }
  }, [value]);

  const handle = tapMemo(
    () => ({
      getState: () => valueRef.current,
      subscribe: (callback: () => void) => {
        subscribers.add(callback);
        return () => subscribers.delete(callback);
      },
      updateInput: (props: P) => {
        setProps(() => props);
      },
      dispose: onDispose,
    }),
    []
  );

  return handle;
};

export const createResource = <R, P>(
  element: ResourceElement<R, P>
): ResourceHandle<R, P> => {
  const props = {
    element,
    onDispose: () => unmountResource(fiber),
  };

  const scheduler = new UpdateScheduler(() => {
    const result = renderResource(fiber, props);
    commitResource(fiber, result);
  });

  const fiber = createResourceFiber(HandleWrapperResource<R, P>, () =>
    scheduler.markDirty()
  );

  const result = renderResource(fiber, props);
  commitResource(fiber, result);

  return result.state;
};
