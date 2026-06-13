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
): useTapRoot.Root<R> & { unmount: () => void } => {
  const fiber = createResourceFiber(
    useTapRoot,
    createResourceFiberRoot((evaluate, apply) => {
      new UpdateScheduler(() => {
        if (evaluate()) {
          apply();
          throw new Error("Unexpected rerender of createTapRoot outer fiber");
        }
        return false;
      }).markDirty();
    }),
    undefined,
    isDevelopment ? "root" : null,
  );

  // In strict mode, render twice to detect side effects
  if (isDevelopment && fiber.devStrictMode === "root") {
    void renderResourceFiber(fiber, [render]);
  }

  const rendered = renderResourceFiber(fiber, [render]);
  flushTapSync(() => commitResourceFiber(fiber, rendered));

  const root = rendered.value as useTapRoot.Root<R>;

  return {
    ...root,
    unmount: () => {
      unmountResourceFiber(fiber);
    },
  };
};
