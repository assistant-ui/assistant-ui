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
import { getCurrentResourceFiber } from "./core/helpers/execution-context";
import { commitRoot } from "./core/helpers/root";

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
  const outerFiber = getCurrentResourceFiber();
  const fiber = tapMemo(() => {
    void element.key;

    return createResourceFiber(element.type, {
      dispatchUpdate: (callback) => {
        outerFiber.root.dispatchUpdate(() => {
          if (callback()) {
            scheduler.markDirty();
          }
          return false;
        });
      },
      dirtyCells: [],
    });
  }, [outerFiber, element.type, element.key]);

  const render = renderResourceFiber(fiber, element.props);

  const isMountedRef = tapRef(false);
  const committedPropsRef = tapRef(element.props);
  const valueRef = tapRef<TState>(render.output);
  const subscribers = tapConst(() => new Set<() => void>(), []);
  const handleUpdate = tapEffectEvent((render: RenderResult | null) => {
    if (!isMountedRef.current) return; // skip update if not mounted

    if (render === null) {
      if (isDevelopment && fiber.devStrictMode) {
        void renderResourceFiber(fiber, committedPropsRef.current);
      }

      render = renderResourceFiber(fiber, committedPropsRef.current);
    }

    if (scheduler.isDirty) return;
    committedPropsRef.current = render.props;

    commitRoot(fiber.root);
    commitResourceFiber(fiber, render);

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
    handleUpdate(render);
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
