import {
  commitResourceFiber,
  createResourceFiber,
  renderResourceFiber,
  unmountResourceFiber,
} from "./core/ResourceFiber";
import { UpdateScheduler } from "./core/scheduler";
import { tapConst } from "./hooks/tap-const";
import { tapMemo } from "./hooks/tap-memo";
import { tapEffect } from "./hooks/tap-effect";
import { tapEffectEvent } from "./hooks/tap-effect-event";
import { tapRef } from "./hooks/tap-ref";
import { RenderResult, ResourceElement } from "./core/types";
import { isDevelopment } from "./core/helpers/env";
import { commitRoot, setRootVersion } from "./core/helpers/root";

export namespace tapResourceRoot {
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

// currently we never reset the root, because rollbakcs are not supported in tapResourceRoot

export const tapResourceRoot = <TState>(
  element: ResourceElement<TState>,
): tapResourceRoot.SubscribableResource<TState> => {
  const scheduler = tapConst(
    () => new UpdateScheduler(() => handleUpdate(null)),
    [],
  );
  const queue = tapConst(() => [] as (() => void)[], []);

  const fiber = tapMemo(() => {
    void element.key;

    return createResourceFiber(element.type, {
      version: 0,
      dispatchUpdate: (callback) => {
        if (!scheduler.isDirty && !callback()) return;
        queue.push(callback);
        scheduler.markDirty();
      },
      dirtyCells: [],
    });
  }, [element.type, element.key]);

  setRootVersion(fiber.root, 0);
  const render = renderResourceFiber(fiber, element.props);

  const isMountedRef = tapRef(false);
  const committedPropsRef = tapRef(element.props);
  const valueRef = tapRef<TState>(render.output);
  const subscribers = tapConst(() => new Set<() => void>(), []);
  const handleUpdate = tapEffectEvent((render: RenderResult | null) => {
    if (render === null) {
      setRootVersion(fiber.root, 2);
      setRootVersion(fiber.root, 1);

      queue.forEach((callback) => {
        if (isDevelopment && fiber.devStrictMode) {
          callback();
        }

        callback();
      });

      if (isDevelopment && fiber.devStrictMode) {
        void renderResourceFiber(fiber, committedPropsRef.current);
      }

      render = renderResourceFiber(fiber, committedPropsRef.current);
    }

    if (scheduler.isDirty)
      throw new Error("Scheduler is dirty, this should never happen");

    commitRoot(fiber.root);
    queue.length = 0;

    if (isMountedRef.current) {
      commitResourceFiber(fiber, render);
    }

    if (scheduler.isDirty || valueRef.current === render.output) return;
    valueRef.current = render.output;
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
    committedPropsRef.current = render.props;
    commitRoot(fiber.root);
    commitResourceFiber(fiber, render);

    if (scheduler.isDirty || valueRef.current === render.output) return;
    valueRef.current = render.output;
    subscribers.forEach((callback) => callback());
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
