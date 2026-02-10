import { ResourceElement } from "./types";
import {
  createResourceFiber,
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "./ResourceFiber";
import { tapResourceRoot } from "../tapResourceRoot";
import { resource } from "./resource";
import { isDevelopment } from "./helpers/env";
import { flushResourcesSync, UpdateScheduler } from "./scheduler";

const SubscribableResource = resource(tapResourceRoot);

export const createResourceRoot = () => {
  const fiber = createResourceFiber<
    tapResourceRoot.SubscribableResource<any>,
    ResourceElement<any>
  >(
    SubscribableResource,
    {
      version: 0,
      dispatchUpdate: (callback) => {
        new UpdateScheduler(() => {
          if (callback()) {
            throw new Error(
              "Unexpected rerender of createResourceRoot outer fiber",
            );
          }
          return false;
        }).markDirty();
      },
      dirtyCells: [],
    },
    undefined,
    isDevelopment ? "root" : null,
  );

  return {
    render: <R, P>(element: ResourceElement<R, P>) => {
      // In strict mode, render twice to detect side effects
      if (isDevelopment && fiber.devStrictMode === "root") {
        void renderResourceFiber(fiber, element);
      }

      const render = renderResourceFiber(fiber, element);

      flushResourcesSync(() => commitResourceFiber(fiber, render));

      return render.output;
    },
    unmount: () => {
      unmountResourceFiber(fiber);
    },
  };
};
