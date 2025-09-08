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
import { tapEffect } from "../hooks/tap-effect";

export interface ResourceHandle<R, P> {
  getState(): R;
  subscribe(callback: () => void): Unsubscribe;
  updateInput(props: P): void;
  flushSync(): void;
  dispose(): void;
}

const HandleWrapperResource = <R, P>({
  element,
  onUpdateInput,
  onFlushSync,
  onDispose,
}: {
  element: ResourceElement<R, P>;
  onUpdateInput: () => void;
  onFlushSync: () => void;
  onDispose: () => void;
}): ResourceHandle<R, P> => {
  const [props, setProps] = tapState(element.props);
  const value = tapInlineResource({ type: element.type, props });
  const subscribers = tapRef(new Set<() => void>()).current;
  const valueRef = tapRef(value);

  tapEffect(() => {
    if (value !== valueRef.current) {
      valueRef.current = value;
      subscribers.forEach((callback) => callback());
    }
  });

  const handle = tapMemo(
    () => ({
      getState: () => valueRef.current,
      subscribe: (callback: () => void) => {
        subscribers.add(callback);
        return () => subscribers.delete(callback);
      },
      updateInput: (props: P) => {
        onUpdateInput();
        setProps(() => props);
      },
      flushSync: onFlushSync,
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
      commitResource(fiber, lastRender);
    },
    onFlushSync: () => {
      scheduler.flushSync();
    },
    onDispose: () => unmountResource(fiber),
  };

  const scheduler = new UpdateScheduler(() => {
    lastRender = renderResource(fiber, props);
    if (isMounted) commitResource(fiber, lastRender);
  });

  const fiber = createResourceFiber(HandleWrapperResource<R, P>, () =>
    scheduler.markDirty(),
  );

  let lastRender = renderResource(fiber, props);
  if (isMounted) commitResource(fiber, lastRender);
  return lastRender.state;
};
