import {
  createResourceFiber,
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "./ResourceFiber";
import { useTapRoot } from "../hooks/useTapRoot";
import { isDevelopment } from "./helpers/env";
import { flushTapSync, UpdateScheduler } from "./scheduler";
import { createResourceFiberRoot } from "./helpers/root";

export const createTapRoot = <R>(
  render: () => R,
  options?: { mountOnSubscribe?: boolean },
): useTapRoot.Root<R> & { unmount: () => void } => {
  const pendingEvaluates: (() => boolean)[] = [];
  const scheduler = new UpdateScheduler(() => {
    for (const evaluate of pendingEvaluates.splice(0)) {
      if (evaluate()) {
        throw new Error("Unexpected rerender of createTapRoot outer fiber");
      }
    }
  });

  const fiber = createResourceFiber(
    useTapRoot,
    createResourceFiberRoot((evaluate) => {
      pendingEvaluates.push(evaluate);
      scheduler.markDirty();
    }),
    undefined,
    isDevelopment ? "root" : null,
  );

  // In strict mode, render twice to detect side effects
  const renderFiber = () => {
    if (isDevelopment && fiber.devStrictMode) {
      void renderResourceFiber(fiber, [render]);
    }
    return renderResourceFiber(fiber, [render]) as useTapRoot.Root<R>;
  };

  // The commit runs as a drain task so effects execute inside the flush.
  const commitScheduler = new UpdateScheduler(() => commitResourceFiber(fiber));
  const commitFiber = () => flushTapSync(() => commitScheduler.markDirty());

  let root: useTapRoot.Root<R> | undefined;
  const ensureRoot = () => (root ??= renderFiber());

  if (!options?.mountOnSubscribe) {
    const root = ensureRoot();
    commitFiber();

    return {
      ...root,
      unmount: () => unmountResourceFiber(fiber),
    };
  }

  let subscriberCount = 0;
  const unmountScheduler = new UpdateScheduler(() => {
    if (subscriberCount === 0) unmountResourceFiber(fiber);
  });

  return {
    getValue: () => ensureRoot().getValue(),
    subscribe: (listener) => {
      const unsubscribe = ensureRoot().subscribe(listener);
      if (subscriberCount++ === 0 && !fiber.isMounted) {
        try {
          commitFiber();
        } catch (error) {
          try {
            unmountResourceFiber(fiber);
          } finally {
            subscriberCount--;
            unsubscribe();
          }
          throw error;
        }
      }

      let isSubscribed = true;
      return () => {
        if (!isSubscribed) return;
        isSubscribed = false;
        unsubscribe();
        if (--subscriberCount === 0) unmountScheduler.markDirty();
      };
    },
    unmount: () => {
      throw new Error("unmount() is not supported with mountOnSubscribe");
    },
  };
};
