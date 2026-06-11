import {
  commitResourceFiber,
  createResourceFiber,
  renderResourceFiber,
  unmountResourceFiber,
} from "../core/ResourceFiber";
import { UpdateScheduler } from "../core/scheduler";
import { isDevelopment } from "../core/helpers/env";
import {
  commitRoot,
  createResourceFiberRoot,
  setRootVersion,
} from "../core/helpers/root";
import { useEffectEvent, useLayoutEffect, useMemo, useRef } from "react";
import { useDevStrictMode } from "./utils/useDevStrictMode";

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

const useHostRoot = <R>(render: () => R): R => render();

export const useTapRoot = <R>(render: () => R): useTapRoot.Root<R> => {
  const scheduler = useMemo(
    () => new UpdateScheduler(() => handleUpdate()),
    [],
  );
  const queue = useMemo(() => [] as (() => boolean)[], []);

  const getDevStrictMode = useDevStrictMode();
  const fiber = useMemo(() => {
    const root = createResourceFiberRoot((callback) => {
      if (!scheduler.isDirty && !callback()) return;

      setRootVersion(root, root.committedVersion + root.changelog.length);
      queue.push(callback);
      scheduler.markDirty();
    });
    return createResourceFiber(
      useHostRoot<R>,
      root,
      undefined,
      getDevStrictMode(),
    );
  }, [queue, scheduler, getDevStrictMode]);

  const drainedCount = fiber.root.version - fiber.root.committedVersion;
  const render2 = renderResourceFiber(fiber, [render]);

  const isMountedRef = useRef(false);
  const committedArgsRef = useRef([render] as const);
  const valueRef = useRef<R>(render2.output);
  const subscribers = useMemo(() => new Set<() => void>(), []);

  const publish = (output: R) => {
    if (scheduler.isDirty || valueRef.current === output) return;
    valueRef.current = output;
    subscribers.forEach((listener) => listener());
  };

  const handleUpdate = useEffectEvent(() => {
    setRootVersion(fiber.root, fiber.root.committedVersion);

    queue.forEach((callback) => {
      if (isDevelopment && fiber.devStrictMode) {
        callback();
      }

      callback();
    });

    setRootVersion(
      fiber.root,
      fiber.root.committedVersion + fiber.root.changelog.length,
    );

    if (isDevelopment && fiber.devStrictMode) {
      void renderResourceFiber(fiber, committedArgsRef.current);
    }

    const render = renderResourceFiber(fiber, committedArgsRef.current);

    if (scheduler.isDirty)
      throw new Error("Scheduler is dirty, this should never happen");

    commitRoot(fiber.root);
    queue.length = 0;

    if (isMountedRef.current) {
      commitResourceFiber(fiber, render);
    }

    publish(render.output);
  });

  useLayoutEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      unmountResourceFiber(fiber);
    };
  }, [fiber]);

  useLayoutEffect(() => {
    committedArgsRef.current = [render];
    commitRoot(fiber.root);
    queue.splice(0, drainedCount);
    commitResourceFiber(fiber, render2);

    publish(render2.output);
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
