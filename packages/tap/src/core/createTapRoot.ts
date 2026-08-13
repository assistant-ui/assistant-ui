import {
  createResourceFiber,
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "./ResourceFiber";
import { useTapRoot } from "../hooks/useTapRoot";
import { isDevelopment } from "./helpers/env";
import { flushTapSync, scheduleTask } from "./scheduler";
import { createResourceFiberRoot } from "./helpers/root";
import { isThenable } from "./helpers/thenable";

export const createTapRoot = <R>(
  render: () => R,
  options?: { mountOnSubscribe?: boolean },
): useTapRoot.Root<R> & { unmount: () => void } => {
  const fiber = createResourceFiber(
    useTapRoot,
    createResourceFiberRoot(() => {
      throw new Error("Unexpected update on createTapRoot outer fiber");
    }),
    undefined,
    isDevelopment ? "root" : null,
  );

  // In strict mode, render twice to detect side effects
  const renderFiber = () => {
    try {
      if (isDevelopment && fiber.devStrictMode) {
        void renderResourceFiber(fiber, [render]);
      }
      return renderResourceFiber(fiber, [render]) as useTapRoot.Root<R>;
    } catch (error) {
      if (isThenable(error)) {
        throw new Error(
          "createTapRoot suspended during its initial render; resolve the " +
            "data first or use useTapRoot under a Suspense boundary.",
        );
      }
      throw error;
    }
  };

  const commitFiber = () =>
    flushTapSync(() => scheduleTask(() => commitResourceFiber(fiber)));

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
  const scheduleUnmount = () =>
    scheduleTask(() => {
      if (subscriberCount === 0 && fiber.isMounted) unmountResourceFiber(fiber);
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
        if (--subscriberCount === 0) scheduleUnmount();
      };
    },
    unmount: () => {
      throw new Error("unmount() is not supported with mountOnSubscribe");
    },
  };
};
