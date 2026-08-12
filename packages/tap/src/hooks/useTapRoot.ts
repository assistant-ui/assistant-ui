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
import { cloneCurrentTapContext, withTapContextRoot } from "../core/context";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
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
  // oxlint-disable-next-line react-hooks/rules-of-hooks -- updates run through the component's Effect Event after the scheduler is initialized
  const [scheduler] = useState(() => new UpdateScheduler(() => handleUpdate()));
  const [queue] = useState<(() => boolean)[]>(() => []);

  const getDevStrictMode = useDevStrictMode();
  const [fiber] = useState(() => {
    const root = createResourceFiberRoot((evaluate, apply) => {
      if (!scheduler.isDirty) {
        if (!evaluate()) return;
        apply();
      }

      setRootVersion(root, root.committedVersion + root.changelog.length);
      queue.push(apply);
      scheduler.markDirty();
    });
    return createResourceFiber(
      useHostRoot<R>,
      root,
      undefined,
      getDevStrictMode(),
    );
  });

  const context = cloneCurrentTapContext();

  const drainedCount = fiber.root.version - fiber.root.committedVersion;
  const render2 = withTapContextRoot(context, () => {
    return renderResourceFiber(fiber, [render]);
  });

  const stateRef = useRef<{
    isMounted: boolean;
    committedArgs: readonly [() => R];
    value: R;
    // Written every render, consumed by the first commit that follows. A
    // commit replayed without a render (StrictMode, Activity reveal, tap
    // reconnect) finds it null and must not restore render-scoped state or
    // publish.
    pendingCommit: {
      args: readonly [() => R];
      value: R;
      drainedCount: number;
      context: ReturnType<typeof cloneCurrentTapContext>;
    } | null;
  }>({
    isMounted: false,
    committedArgs: [render],
    value: render2,
    pendingCommit: null,
  });
  stateRef.current.pendingCommit = {
    args: [render],
    value: render2,
    drainedCount,
    context,
  };
  const [subscribers] = useState(() => new Set<() => void>());

  const publish = (output: R) => {
    if (scheduler.isDirty || stateRef.current.value === output) return;
    stateRef.current.value = output;
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
      void withTapContextRoot(fiber.root.context, () => {
        return renderResourceFiber(fiber, stateRef.current.committedArgs);
      });
    }

    const render = withTapContextRoot(fiber.root.context, () => {
      return renderResourceFiber(fiber, stateRef.current.committedArgs);
    });

    if (scheduler.isDirty)
      throw new Error("Scheduler is dirty, this should never happen");

    commitRoot(fiber.root);
    queue.length = 0;

    if (stateRef.current.isMounted) {
      commitResourceFiber(fiber);
    }

    publish(render);
  });

  useEffect(() => {
    const current = stateRef.current;
    current.isMounted = true;
    if (!fiber.isNeverMounted && !fiber.isMounted) commitResourceFiber(fiber);
    return () => {
      current.isMounted = false;
      unmountResourceFiber(fiber);
    };
  }, [fiber]);

  useEffect(() => {
    const pending = stateRef.current.pendingCommit;
    if (pending === null) return;
    stateRef.current.pendingCommit = null;

    stateRef.current.committedArgs = pending.args;
    commitRoot(fiber.root);
    queue.splice(0, pending.drainedCount);
    fiber.root.context = pending.context;
    commitResourceFiber(fiber);

    publish(pending.value);
  });

  return useMemo(
    () => ({
      getValue: () => stateRef.current.value,
      subscribe: (listener: () => void) => {
        subscribers.add(listener);
        return () => subscribers.delete(listener);
      },
    }),
    [subscribers],
  );
};
