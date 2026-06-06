import {
  commitResourceFiber,
  createResourceFiber,
  renderResourceFiber,
  unmountResourceFiber,
} from "../core/ResourceFiber";
import { UpdateScheduler } from "../core/scheduler";
import { useMemo } from "./useMemo";
import { useEffect } from "./useEffect";
import { useEffectEvent } from "./useEffectEvent";
import { useRef } from "./useRef";
import type { RenderResult, ResourceElement } from "../core/types";
import { isDevelopment } from "../core/helpers/env";
import {
  commitRoot,
  createResourceFiberRoot,
  setRootVersion,
} from "../core/helpers/root";

export namespace useResourceRoot {
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

// The root is never reset, because rollbacks are not supported in useResourceRoot.

export const useResourceRoot = <TState>(
  element: ResourceElement<TState>,
): useResourceRoot.SubscribableResource<TState> => {
  const scheduler = useMemo(
    () => new UpdateScheduler(() => handleUpdate(null)),
    [],
  );
  const queue = useMemo(() => [] as (() => void)[], []);

  const fiber = useMemo(() => {
    void element.key;

    return createResourceFiber(
      element.type,
      createResourceFiberRoot((callback) => {
        if (!scheduler.isDirty && !callback()) return;
        queue.push(callback);
        scheduler.markDirty();
      }),
    );
  }, [element.type, element.key]);

  setRootVersion(fiber.root, fiber.root.committedVersion);
  const render = renderResourceFiber(fiber, element.props);

  const isMountedRef = useRef(false);
  const committedPropsRef = useRef(element.props);
  const valueRef = useRef<TState>(render.output);
  const subscribers = useMemo(() => new Set<() => void>(), []);
  const handleUpdate = useEffectEvent((render: RenderResult | null) => {
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

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      unmountResourceFiber(fiber);
    };
  }, [fiber]);

  useEffect(() => {
    committedPropsRef.current = render.props;
    commitRoot(fiber.root);
    commitResourceFiber(fiber, render);

    if (scheduler.isDirty || valueRef.current === render.output) return;
    valueRef.current = render.output;
    subscribers.forEach((callback) => callback());
  });

  return useMemo(
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
