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
import { throwAggregated } from "../core/helpers/throwAggregated";
import type { ResourceContext, ResourceFiber } from "../core/types";
import { useEffect, useMemo, useRef, useState } from "react";
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

const notifySubscribers = (subscribers: Iterable<() => void>): void => {
  const errors: unknown[] = [];
  for (const listener of subscribers) {
    try {
      listener();
    } catch (error) {
      errors.push(error);
    }
  }
  throwAggregated(
    errors,
    "Errors occurred while notifying Tap root subscribers",
  );
};

type Instance<R> = {
  readonly scheduler: UpdateScheduler;
  readonly queue: (() => boolean)[];
  readonly fiber: ResourceFiber<R>;
  readonly subscribers: Set<() => void>;
  pendingHostRender: boolean;
  isMounted: boolean;
  hasRendered: boolean;
  committedRender: () => R;
  context: ResourceContext;
  value: R;
  applyQueue(): number;
  publish(output: R, version: number): void;
  finishFlush(output: R, version: number, drained: number): void;
  handleUpdate(): void;
};

const createInstance = <R>(
  render: () => R,
  devStrictMode: "root" | "child" | null,
  forceHostRender: (update: (count: number) => number) => void,
): Instance<R> => {
  const scheduler = new UpdateScheduler(() => inst.handleUpdate());
  const queue: Instance<R>["queue"] = [];
  const root = createResourceFiberRoot((evaluate, apply) => {
    if (queue.length === 0 && !evaluate()) return;
    queue.push(apply);
    scheduler.markDirty();
  });
  const fiber = createResourceFiber(
    useHostRoot<R>,
    root,
    undefined,
    devStrictMode,
  );

  const inst: Instance<R> = {
    scheduler,
    queue,
    fiber,
    subscribers: new Set(),
    pendingHostRender: false,
    isMounted: false,
    hasRendered: false,
    committedRender: render,
    context: new Map(),
    value: undefined as unknown as R,

    applyQueue: () => {
      setRootVersion(root, root.committedVersion);

      for (const apply of queue) {
        if (isDevelopment && fiber.devStrictMode) apply();
        apply();
      }

      setRootVersion(root, root.committedVersion + root.changelog.length);
      return queue.length;
    },

    publish: (output, version) => {
      if (
        scheduler.isDirty ||
        root.committedVersion !== version ||
        inst.value === output
      )
        return;
      inst.value = output;
      scheduleNotify(() => notifySubscribers(inst.subscribers));
    },

    finishFlush: (output, version, drained) => {
      commitRoot(root);
      queue.splice(0, drained);
      inst.pendingHostRender = false;
      if (queue.length === 0) scheduler.settle();
      if (inst.isMounted) commitResourceFiber(fiber);
      inst.publish(output, version);
    },

    handleUpdate: () => {
      const drained = inst.applyQueue();

      let output: R;
      try {
        if (isDevelopment && fiber.devStrictMode) {
          void withTapContextRoot(inst.context, () => {
            return renderResourceFiber(fiber, [inst.committedRender]);
          });
        }

        output = withTapContextRoot(inst.context, () => {
          return renderResourceFiber(fiber, [inst.committedRender]);
        });
      } catch (error) {
        // Suspended outside a React render: hold the committed value and retry
        // once the thenable settles (transition semantics).
        setRootVersion(root, root.committedVersion);
        if (isThenable(error)) {
          const retry = () => {
            if (inst.isMounted) scheduler.markDirty();
          };
          error.then(retry, retry);
          return;
        }
        if (inst.isMounted) {
          inst.pendingHostRender = true;
          forceHostRender((c) => c + 1);
          return;
        }
        throw error;
      }

      if (scheduler.isDirty)
        throw new Error("Scheduler is dirty, this should never happen");

      inst.finishFlush(output, root.version, drained);
    },
  };
  return inst;
};

export const useTapRoot = <R>(render: () => R): useTapRoot.Root<R> => {
  const [, forceHostRender] = useState(0);
  const getDevStrictMode = useDevStrictMode();

  const instRef = useRef<Instance<R> | null>(null);
  const inst = (instRef.current ??= createInstance(
    render,
    getDevStrictMode(),
    forceHostRender,
  ));

  const context = cloneCurrentTapContext();

  // A host render that arrives while a flush is pending consumes the queue
  // itself; the commit effect then settles the scheduler so the flush no-ops.
  const drained =
    inst.scheduler.isDirty || inst.pendingHostRender ? inst.applyQueue() : 0;

  const value = withTapContextRoot(context, () => {
    return renderResourceFiber(inst.fiber, [render]);
  });

  const renderState = {
    render,
    context,
    value,
    drained,
    wip: inst.fiber.wipCommitCallbacks,
    version: inst.fiber.root.version,
    processed: false,
  };

  if (!inst.hasRendered) {
    inst.hasRendered = true;
    inst.committedRender = render;
    inst.context = context;
    inst.value = value;
  }

  useEffect(() => {
    inst.isMounted = true;
    return () => {
      inst.isMounted = false;
      unmountResourceFiber(inst.fiber);
    };
  }, [inst]);

  useEffect(() => {
    if (renderState.processed) {
      if (!inst.fiber.isMounted) {
        commitResourceFiber(inst.fiber);
        if (inst.queue.length && !inst.scheduler.isDirty)
          inst.scheduler.markDirty();
      }
      return;
    }
    renderState.processed = true;

    inst.committedRender = renderState.render;
    inst.context = renderState.context;
    if (inst.fiber.wipCommitCallbacks !== renderState.wip) {
      if (!inst.scheduler.isDirty) inst.handleUpdate();
      return;
    }

    if (
      renderState.drained > 0 &&
      inst.fiber.root.version === renderState.version
    ) {
      inst.finishFlush(
        renderState.value,
        renderState.version,
        renderState.drained,
      );
      return;
    }

    commitResourceFiber(inst.fiber);
    inst.publish(renderState.value, renderState.version);
  });

  return useMemo(
    () => ({
      getValue: () => inst.value,
      subscribe: (listener: () => void) => {
        inst.subscribers.add(listener);
        return () => inst.subscribers.delete(listener);
      },
    }),
    [inst],
  );
};
