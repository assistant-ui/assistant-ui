import {
  commitResourceFiber,
  createResourceFiber,
  renderResourceFiber,
  unmountResourceFiber,
} from "../core/ResourceFiber";
import { scheduleNotify, UpdateScheduler } from "../core/scheduler";
import { isDevelopment } from "../core/helpers/env";
import {
  commitRoot,
  createResourceFiberRoot,
  setRootVersion,
} from "../core/helpers/root";
import { cloneCurrentTapContext, withTapContextRoot } from "../core/context";
import { isThenable } from "../core/helpers/thenable";
import type { ResourceContext } from "../core/types";
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
  const [queue] = useState<
    { apply: () => boolean; appliedAt: number | null }[]
  >(() => []);

  const getDevStrictMode = useDevStrictMode();
  const [fiber] = useState(() => {
    const root = createResourceFiberRoot((evaluate, apply) => {
      const isEager = !scheduler.isDirty;
      if (isEager) {
        if (!evaluate()) return;
        apply();
      }

      setRootVersion(root, root.committedVersion + root.changelog.length);
      queue.push({ apply, appliedAt: isEager ? root.version : null });
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

  const value = withTapContextRoot(context, () => {
    return renderResourceFiber(fiber, [render]);
  });

  const args: readonly [() => R] = [render];
  const wip = fiber.wipCommitCallbacks;
  const version = fiber.root.version;
  let processed = false;

  const stateRef = useRef<{
    isMounted: boolean;
    committedArgs: readonly [() => R];
    context: ResourceContext;
    value: R;
  }>({
    isMounted: false,
    committedArgs: args,
    context,
    value,
  });
  const [subscribers] = useState(() => new Set<() => void>());

  const publish = (output: R, version: number) => {
    if (
      scheduler.isDirty ||
      fiber.root.committedVersion !== version ||
      stateRef.current.value === output
    )
      return;
    stateRef.current.value = output;
    scheduleNotify(() => subscribers.forEach((listener) => listener()));
  };

  const handleUpdate = useEffectEvent(() => {
    setRootVersion(fiber.root, fiber.root.committedVersion);

    queue.forEach((entry) => {
      if (isDevelopment && fiber.devStrictMode) {
        entry.apply();
      }

      entry.apply();
    });

    setRootVersion(
      fiber.root,
      fiber.root.committedVersion + fiber.root.changelog.length,
    );

    let render: R;
    try {
      if (isDevelopment && fiber.devStrictMode) {
        void withTapContextRoot(stateRef.current.context, () => {
          return renderResourceFiber(fiber, stateRef.current.committedArgs);
        });
      }

      render = withTapContextRoot(stateRef.current.context, () => {
        return renderResourceFiber(fiber, stateRef.current.committedArgs);
      });
    } catch (error) {
      // Suspended outside a React render: hold the committed value and retry
      // once the thenable settles (transition semantics).
      if (isThenable(error)) {
        setRootVersion(fiber.root, fiber.root.committedVersion);
        const retry = () => {
          if (stateRef.current.isMounted) scheduler.markDirty();
        };
        error.then(retry, retry);
        return;
      }
      throw error;
    }

    if (scheduler.isDirty)
      throw new Error("Scheduler is dirty, this should never happen");

    const version = fiber.root.version;
    commitRoot(fiber.root);
    queue.length = 0;

    if (stateRef.current.isMounted) {
      commitResourceFiber(fiber);
    }

    publish(render, version);
  });

  useEffect(() => {
    const current = stateRef.current;
    current.isMounted = true;
    return () => {
      current.isMounted = false;
      unmountResourceFiber(fiber);
    };
  }, [fiber]);

  useEffect(() => {
    if (processed) {
      if (!fiber.isMounted) {
        commitResourceFiber(fiber);
        if (queue.length && !scheduler.isDirty) scheduler.markDirty();
      }
      return;
    }
    processed = true;

    stateRef.current.committedArgs = args;
    stateRef.current.context = context;
    if (fiber.wipCommitCallbacks !== wip) {
      if (!scheduler.isDirty) handleUpdate();
      return;
    }

    commitResourceFiber(fiber);
    for (let i = queue.length - 1; i >= 0; i--) {
      const entry = queue[i]!;
      if (
        entry.appliedAt !== null &&
        entry.appliedAt <= fiber.root.committedVersion
      ) {
        queue.splice(i, 1);
      }
    }

    publish(value, version);
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
