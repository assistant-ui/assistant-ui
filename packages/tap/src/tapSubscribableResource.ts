import {
  commitResourceFiber,
  createResourceFiber,
  renderResourceFiber,
  unmountResourceFiber,
} from "./core/ResourceFiber";
import { flushResourcesSync, UpdateScheduler } from "./core/scheduler";
import { tapConst } from "./hooks/tap-const";
import { tapMemo } from "./hooks/tap-memo";
import { tapEffect } from "./hooks/tap-effect";
import { tapEffectEvent } from "./hooks/tap-effect-event";
import { tapRef } from "./hooks/tap-ref";
import { RenderResult, ResourceElement } from "./core/types";

export namespace tapSubscribableResource {
  export type Unsubscribe = () => void;

  export interface SubscribableResource<TState> {
    /**
     * Get the current state of the store.
     */
    getValue(): TState;

    /**
     * Subscribe to the store.
     */
    subscribe(listener: () => void): Unsubscribe;
  }
}

export const tapSubscribableResource = <TState>(
  element: ResourceElement<TState>,
): tapSubscribableResource.SubscribableResource<TState> => {
  const scheduler = tapConst(
    () =>
      new UpdateScheduler(() => {
        lastRenderRef.current = null;
        handleUpdate();
      }),
    [],
  );
  const fiber = tapMemo(() => {
    void element.key;

    return createResourceFiber(element.type, (callback) => {
      if (callback()) {
        scheduler.markDirty();
      }
    });
  }, [element.type, element.key]);

  const lastRenderRef = tapRef<RenderResult | null>(null);
  lastRenderRef.current = renderResourceFiber(fiber, element.props);

  const isMountedRef = tapRef(false);
  const committedPropsRef = tapRef(element.props);
  const valueRef = tapRef<TState>(lastRenderRef.current.output);
  const subscribers = tapConst(() => new Set<() => void>(), []);
  const handleUpdate = tapEffectEvent(() => {
    if (!isMountedRef.current) return; // skip update if not mounted

    if (lastRenderRef.current === null) {
      lastRenderRef.current = renderResourceFiber(
        fiber,
        committedPropsRef.current,
      );
    }

    if (scheduler.isDirty) return;
    committedPropsRef.current = lastRenderRef.current.props;
    commitResourceFiber(fiber, lastRenderRef.current);

    if (scheduler.isDirty || valueRef.current === lastRenderRef.current.output)
      return;
    valueRef.current = lastRenderRef.current.output;
    subscribers.forEach((callback) => callback());
  });

  tapEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      unmountResourceFiber(fiber);
    };
  }, [fiber]);

  tapEffect(() => {
    flushResourcesSync(handleUpdate);
  });

  return tapMemo(
    () => ({
      getValue: () => valueRef.current,
      subscribe: (listener: () => void) => {
        subscribers.add(listener);
        return () => subscribers.delete(listener);
      },
    }),
    [],
  );
};
