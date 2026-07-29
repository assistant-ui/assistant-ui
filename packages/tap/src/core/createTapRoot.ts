import {
  createResourceFiber,
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "./ResourceFiber";
import { useTapRoot } from "../hooks/useTapRoot";
import { isDevelopment } from "./helpers/env";
import {
  flushTapSync,
  throwCollectedErrors,
  UpdateScheduler,
} from "./scheduler";
import { createResourceFiberRoot } from "./helpers/root";

export const createTapRoot = <R>(
  render: () => R,
): useTapRoot.Root<R> & { unmount: () => void } => {
  // One scheduler per root, mirroring useTapRoot: a per-scheduler re-run
  // guard then covers this root type too. Dispatches queue up and drain in
  // order within a single flush task; a failing update must not discard
  // the updates queued behind it, so entries are consumed one at a time
  // and every failure is rethrown only after the rest were processed.
  const dispatchQueue: { evaluate: () => boolean; apply: () => boolean }[] = [];
  const scheduler = new UpdateScheduler(() => {
    const errors: unknown[] = [];
    while (dispatchQueue.length > 0) {
      const { evaluate, apply } = dispatchQueue.shift()!;
      try {
        if (evaluate()) {
          apply();
          throw new Error("Unexpected rerender of createTapRoot outer fiber");
        }
      } catch (error) {
        errors.push(error);
      }
    }
    throwCollectedErrors(errors);
  });

  const fiber = createResourceFiber(
    useTapRoot,
    createResourceFiberRoot((evaluate, apply) => {
      dispatchQueue.push({ evaluate, apply });
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
  flushTapSync(() => commitResourceFiber(fiber));

  const root = rendered as useTapRoot.Root<R>;

  return {
    ...root,
    unmount: () => {
      unmountResourceFiber(fiber);
    },
  };
};
