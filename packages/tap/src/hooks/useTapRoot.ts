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
import type { RenderResult, Resource } from "../core/types";
import { resource } from "../core/resource";
import { isDevelopment } from "../core/helpers/env";
import {
  commitRoot,
  createResourceFiberRoot,
  setRootVersion,
} from "../core/helpers/root";

export namespace useTapRoot {
  export type Unsubscribe = () => void;

  export interface Root<R> {
    /**
     * Get the current value of the root.
     */
    getValue(): R;

    /**
     * Subscribe to the root.
     */
    subscribe(listener: () => void): Unsubscribe;
  }
}

// Stable content type: renders by invoking the latest callback inline, so the
// callback's hooks run directly in this fiber (no extra child fiber). The
// callback is passed as props, so it can change every render.
const useHostRoot = <R>(render: () => R): R => render();
const HostRoot = resource(useHostRoot);

// The root is never reset, because rollbacks are not supported in useTapRoot.

export const useTapRoot = <R>(render: () => R): useTapRoot.Root<R> => {
  const scheduler = useMemo(
    () => new UpdateScheduler(() => handleUpdate(null)),
    [],
  );
  const queue = useMemo(() => [] as (() => void)[], []);

  const fiber = useMemo(() => {
    return createResourceFiber(
      HostRoot as unknown as Resource<R, () => R>,
      createResourceFiberRoot((callback) => {
        if (!scheduler.isDirty && !callback()) return;
        queue.push(callback);
        scheduler.markDirty();
      }),
    );
  }, [queue, scheduler]);

  setRootVersion(fiber.root, fiber.root.committedVersion);
  const render2 = renderResourceFiber(fiber, render);

  const isMountedRef = useRef(false);
  const committedPropsRef = useRef(render);
  const valueRef = useRef<R>(render2.output);
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
    committedPropsRef.current = render2.props;
    commitRoot(fiber.root);
    commitResourceFiber(fiber, render2);

    if (scheduler.isDirty || valueRef.current === render2.output) return;
    valueRef.current = render2.output;
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
    [subscribers],
  );
};
