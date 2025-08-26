import { ResourceElement, Unsubscribe } from "./types";
import {
  createResourceFiber,
  unmountResource,
  renderResource,
  commitResource,
} from "./ResourceFiber";
import { UpdateScheduler } from "./scheduler";
import { tapRef } from "../hooks/tap-ref";
import { tapState } from "../hooks/tap-state";
import { tapMemo } from "../hooks/tap-memo";
import { tapInlineResource } from "../hooks/tap-inline-resource";

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
  onUpdateInput: () => void;
  onDispose: () => void;
}): ResourceHandle<R, P> => {
  const [props, setProps] = tapState(element.props);
  const value = tapInlineResource({ type: element.type, props });
  const subscribers = tapRef(new Set<() => void>()).current;
  const valueRef = tapRef(value);

  // this is OK here because there is no concurrent rendering
  if (value !== valueRef.current) {
    valueRef.current = value;
    subscribers.forEach((callback) => callback());
  }

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
    [],
  );

  return handle;
};

export const createResource = <R, P>(
  element: ResourceElement<R, P>,
  delayMount = false,
): ResourceHandle<R, P> => {
  let isMounted = !delayMount;
  const props = {
    element,
    onUpdateInput: () => {
      if (isMounted) return;
      isMounted = true;
      scheduler.markDirty();
    },
    onDispose: () => unmountResource(fiber),
  };

  const scheduler = new UpdateScheduler(() => {
    const result = renderResource(fiber, props);
    if (isMounted) commitResource(fiber, result);
  });

  const fiber = createResourceFiber(HandleWrapperResource<R, P>, () =>
    scheduler.markDirty(),
  );

  const result = renderResource(fiber, props);
  if (isMounted) commitResource(fiber, result);
  return result.state;
};
