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
  if (isDevelopment && fiber.devStrictMode === "root") {
    void renderResourceFiber(fiber, [render]);
  }

  const rendered = renderResourceFiber(fiber, [render]);

  const root = rendered as useTapRoot.Root<R>;

  if (!options?.mountOnSubscribe) {
    flushTapSync(() => commitResourceFiber(fiber));

    return {
      ...root,
      unmount: () => unmountResourceFiber(fiber),
    };
  }

  let isDestroyed = false;
  let isMounted = false;
  let hasRenderPending = true;
  let subscriberCount = 0;

  const mount = () => {
    isMounted = true;
    if (!hasRenderPending) {
      void renderResourceFiber(fiber, [render]);
    }
    hasRenderPending = false;
    flushTapSync(() => commitResourceFiber(fiber));
  };

  return {
    getValue: root.getValue,
    subscribe: (listener) => {
      if (isDestroyed) return () => {};
      if (subscriberCount++ === 0 && !isMounted) mount();

      const unsubscribe = root.subscribe(listener);
      let isSubscribed = true;
      return () => {
        if (!isSubscribed) return;
        isSubscribed = false;
        unsubscribe();

        if (--subscriberCount === 0 && !isDestroyed) {
          isMounted = false;
          unmountResourceFiber(fiber);
        }
      };
    },
    unmount: () => {
      if (isDestroyed) return;
      isDestroyed = true;
      if (isMounted) {
        isMounted = false;
        unmountResourceFiber(fiber);
      }
    },
  };
};
