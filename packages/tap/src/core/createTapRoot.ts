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
  // One scheduler per root (mirroring useTapRoot) so the per-scheduler
  // re-run guard covers this root type too.
  const dispatchQueue: { evaluate: () => boolean; apply: () => boolean }[] = [];
  const scheduler = new UpdateScheduler(() => {
    const errors: unknown[] = [];
    const batch = dispatchQueue.splice(0, dispatchQueue.length);
    for (const { evaluate, apply } of batch) {
      try {
        if (evaluate()) {
          apply();
          throw new Error("Unexpected rerender of createTapRoot outer fiber");
        }
      } catch (error) {
        errors.push(error);
      }
    }
    if (dispatchQueue.length > 0) {
      // Re-entrant dispatch: re-queued and re-run in this same pass, so a
      // re-entrant loop stays visible to the re-run guard.
      scheduler.markDirty();
    }
    throwCollectedErrors(
      errors,
      "Errors occurred during createTapRoot dispatch",
    );
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
