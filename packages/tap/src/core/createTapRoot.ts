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

  const fiber = createRisesourceFiber(
    useTapRoot,
    createResourceFiberRoot((evaluate) => {
      pendingEvaluates.push(evaluate);
      scheduler.markDirty();
    }),
    undefined,
    isDevelopment ? (options?.mountOnSubscribe ? "child" : "root") : null,
  );

  // In strict mode, render twice to detect side effects
  const renderFiber = () => {
    if (isDevelopment && fiber.devStrictMode) {
      void renderResourceFiber(fiber, [render]);
    }
    return renderResourceFiber(fiber, [render]) as useTapRoot.Root<R>;
  };

  let root: useTapRoot.Root<R> | undefined;
  const ensureRoot = () => (root ??= renderFiber());

  if (!options?.mountOnSubscribe) {
    const root = ensureRoot();
    flushTapSync(() => commitResourceFiber(fiber));

    return {
      ...root,
      unmount: () => unmountResourceFiber(fiber),
    };
  }

  let subscriberCount = 0;

  return {
    getValue: () => ensureRoot().getValue(),
    subscribe: (listener) => {
      const unsubscribe = ensureRoot().subscribe(listener);
      if (subscriberCount++ === 0) {
        try {
          // Remounts re-render first so the commit sees fresh effect closures
          if (!fiber.isNeverMounted) void renderFiber();
          flushTapSync(() => commitResourceFiber(fiber));
        } catch (error) {
          subscriberCount--;
          unsubscribe();
          if (fiber.isMounted) unmountResourceFiber(fiber);
          throw error;
        }
      }

      let isSubscribed = true;
      return () => {
        if (!isSubscribed) return;
        isSubscribed = false;
        unsubscribe();
        if (--subscriberCount === 0) unmountResourceFiber(fiber);
      };
    },
    unmount: () => {
      throw new Error("unmount() is not supported with mountOnSubscribe");
    },
  };
};
