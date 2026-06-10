import {
  commitResourceFiber,
  createResourceFiber,
  renderResourceFiber,
  unmountResourceFiber,
} from "../core/ResourceFiber";
import { UpdateScheduler } from "../core/scheduler";
import type { RenderResult } from "../core/types";
import { isDevelopment } from "../core/helpers/env";
import { commitRoot, createResourceFiberRoot } from "../core/helpers/root";
import { useEffect, useEffectEvent, useMemo, useRef } from "react";
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
    () => new UpdateScheduler(() => handleUpdate(null)),
    [],
  );

  const getDevStrictMode = useDevStrictMode();
  const fiber = useMemo(() => {
    return createResourceFiber(
      useHostRoot<R>,
      // Updates apply immediately: the cells hold the pending entries (and the
      // root's changelog records them), so the scheduler only batches the
      // re-render. A `false` return is the eager same-state bailout.
      createResourceFiberRoot((callback) => {
        if (!callback()) return;
        scheduler.markDirty();
      }),
      undefined,
      getDevStrictMode(),
    );
  }, [scheduler, getDevStrictMode]);

  // TODO I think dev mode only should double render!
  const render2 = renderResourceFiber(fiber, [render]);

  const isMountedRef = useRef(false);
  const committedArgsRef = useRef([render] as const);
  const valueRef = useRef<R>(render2.output);
  const subscribers = useMemo(() => new Set<() => void>(), []);
  const handleUpdate = useEffectEvent((render: RenderResult | null) => {
    if (render === null) {
      if (isDevelopment && fiber.devStrictMode) {
        void renderResourceFiber(fiber, committedArgsRef.current);
      }

      render = renderResourceFiber(fiber, committedArgsRef.current);
    }

    if (scheduler.isDirty)
      throw new Error("Scheduler is dirty, this should never happen");

    commitRoot(fiber.root);

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
    committedArgsRef.current = [render];
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
