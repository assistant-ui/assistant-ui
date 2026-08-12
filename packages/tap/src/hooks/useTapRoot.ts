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
  // Replay log for React's update semantics (StrictMode double-apply,
  // concurrent rebasing). Mirrors React's eagerState rule: only the first
  // update on a clean queue applies eagerly; `appliedAt` records the root
  // version an eager apply produced (null = queued unapplied), so retirement
  // is derivable at any time instead of a captured count.
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

  const render2 = withTapContextRoot(context, () => {
    return renderResourceFiber(fiber, [render]);
  });

  const stateRef = useRef<{
    isMounted: boolean;
    committedArgs: readonly [() => R];
    value: R;
    // Snapshot of the latest React render, overwritten every render and read
    // by the commit effect. All uses are idempotent, so nothing is consumed.
    renderedArgs: readonly [() => R];
    renderedValue: R;
    renderedContext: ReturnType<typeof cloneCurrentTapContext>;
    // fiber.renderCount at the time of this React render; a mismatch at
    // commit time means the fiber rendered past it (a tap update while
    // hidden) and the snapshot describes a superseded render.
    renderedAt: number;
    // Reset every render, set by the first commit that follows: a commit
    // replayed without a render (StrictMode, Activity reveal, tap reconnect)
    // must not restore render-scoped state or publish again.
    processed: boolean;
  }>({
    isMounted: false,
    committedArgs: [render],
    value: render2,
    renderedArgs: [render],
    renderedValue: render2,
    renderedContext: context,
    renderedAt: fiber.renderCount,
    processed: false,
  });
  stateRef.current.renderedArgs = [render];
  stateRef.current.renderedValue = render2;
  stateRef.current.renderedContext = context;
  stateRef.current.renderedAt = fiber.renderCount;
  stateRef.current.processed = false;
  const [subscribers] = useState(() => new Set<() => void>());

  const publish = (output: R) => {
    if (scheduler.isDirty || stateRef.current.value === output) return;
    stateRef.current.value = output;
    subscribers.forEach((listener) => listener());
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
    // Reconnect only when no fresh React render awaits the commit effect
    // below (it commits or converges past it in this same flush; committing
    // here would bypass the host bookkeeping). An unretired handleUpdate
    // render may exist (rendered while hidden): its host bookkeeping already
    // ran, so committing it here is exactly right.
    if (!fiber.isNeverMounted && !fiber.isMounted && current.processed)
      commitResourceFiber(fiber);
    return () => {
      current.isMounted = false;
      unmountResourceFiber(fiber);
    };
  }, [fiber]);

  useEffect(() => {
    const current = stateRef.current;
    if (current.processed) return;
    current.processed = true;

    current.committedArgs = current.renderedArgs;
    // handleUpdate advanced the fiber past this render (e.g. a hidden
    // Activity re-render followed by a tap update): its value and queue
    // bookkeeping describe a superseded render. Converge by rendering fresh
    // with the render's args and context instead of committing it.
    if (current.renderedAt !== fiber.renderCount) {
      fiber.root.context = current.renderedContext;
      if (!scheduler.isDirty) handleUpdate();
      return;
    }

    fiber.root.context = current.renderedContext;
    commitResourceFiber(fiber);
    // Retire the dispatches the committed render included; entries applied
    // after it (or never applied) stay queued for the next flush.
    for (let i = queue.length - 1; i >= 0; i--) {
      const entry = queue[i]!;
      if (
        entry.appliedAt !== null &&
        entry.appliedAt <= fiber.root.committedVersion
      ) {
        queue.splice(i, 1);
      }
    }

    publish(current.renderedValue);
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
