import { RenderResult, ResourceElement } from "./types";
import {
  createResourceFiber,
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "./ResourceFiber";
import { flushResourcesSync, UpdateScheduler } from "./scheduler";
import { tapRef } from "../hooks/tap-ref";
import { tapState } from "../hooks/tap-state";
import { tapMemo } from "../hooks/tap-memo";
import { tapEffect } from "../hooks/tap-effect";
import { resource } from "./resource";
import { tapResource } from "../hooks/tap-resource";
import { tapConst } from "../hooks/tap-const";
import { getDevStrictMode } from "./execution-context";
import { isDevelopment } from "./env";

export namespace createResource {
  export type Unsubscribe = () => void;

  export interface Handle<R, P> {
    getValue(): R;
    subscribe(callback: () => void): Unsubscribe;
    render(element: ResourceElement<R, P>): void;
    unmount(): void;
  }
}

const HandleWrapperResource = resource(
  <R, P>(state: {
    elementRef: {
      current: ResourceElement<R, P>;
    };
    onRender: (changed: boolean) => boolean;
    onUnmount: () => void;
  }): createResource.Handle<R, P> => {
    const [, setElement] = tapState(state.elementRef.current);
    const output = tapResource(state.elementRef.current);

    const subscribers = tapConst(() => new Set<() => void>(), []);
    const valueRef = tapRef(output);

    tapEffect(() => {
      if (output !== valueRef.current) {
        valueRef.current = output;
        subscribers.forEach((callback) => callback());
      }
    });

    const handle = tapMemo(
      () => ({
        getValue: () => valueRef.current,
        subscribe: (callback: () => void) => {
          subscribers.add(callback);
          return () => subscribers.delete(callback);
        },

        render: (el: ResourceElement<R, P>) => {
          const changed = state.elementRef.current !== el;
          state.elementRef.current = el;

          if (state.onRender(changed)) {
            setElement(el);
          }
        },
        unmount: state.onUnmount,
      }),
      [state],
    );

    return handle;
  },
);

export const createResource = <R, P>(
  element: ResourceElement<R, P>,
  {
    mount = true,
    devStrictMode = false,
  }: { mount?: boolean; devStrictMode?: boolean } = {},
): createResource.Handle<R, P> => {
  let isMounted = mount;
  let render: RenderResult;
  const props = {
    elementRef: { current: element },
    onRender: (changed: boolean) => {
      if (isMounted) return changed;
      isMounted = true;

      if (
        isDevelopment &&
        fiber.isNeverMounted &&
        fiber.devStrictMode === "child"
      ) {
        if (changed) {
          render = renderResourceFiber(fiber, props);
        }
        commitResourceFiber(fiber, render);
      } else {
        flushResourcesSync(() => {
          if (changed) {
            // In strict mode, render twice to detect side effects
            if (isDevelopment && fiber.devStrictMode === "root") {
              void renderResourceFiber(fiber, props);
            }

            render = renderResourceFiber(fiber, props);
          }

          if (scheduler.isDirty) return;
          commitResourceFiber(fiber, render!);
        });
      }

      return false;
    },
    onUnmount: () => {
      if (!isMounted) throw new Error("Resource not mounted");
      isMounted = false;

      unmountResourceFiber(fiber);
    },
  };

  const scheduler = new UpdateScheduler(() => {
    // In strict mode, render twice to detect side effects
    if (
      isDevelopment &&
      (fiber.devStrictMode === "root" ||
        (fiber.devStrictMode && !fiber.isFirstRender))
    ) {
      void renderResourceFiber(fiber, props);
    }

    render = renderResourceFiber(fiber, props);

    if (scheduler.isDirty || !isMounted) return;
    commitResourceFiber(fiber, render);
  });

  const fiber = createResourceFiber(
    HandleWrapperResource<R, P>,
    (callback) => {
      if (callback()) scheduler.markDirty();
    },
    getDevStrictMode(devStrictMode),
  );

  flushResourcesSync(() => {
    scheduler.markDirty();
  });

  return render!.output;
};
