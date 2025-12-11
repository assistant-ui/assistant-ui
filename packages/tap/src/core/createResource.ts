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

export namespace createResource {
  export type Unsubscribe = () => void;

  export interface Handle<R, P> {
    getState(): R;
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
    const value = tapResource(state.elementRef.current);

    const subscribers = tapConst(() => new Set<() => void>(), []);
    const valueRef = tapRef(value);

    tapEffect(() => {
      if (value !== valueRef.current) {
        valueRef.current = value;
        subscribers.forEach((callback) => callback());
      }
    });

    const handle = tapMemo(
      () => ({
        getState: () => valueRef.current,
        subscribe: (callback: () => void) => {
          subscribers.add(callback);
          return () => subscribers.delete(callback);
        },

        render: (el: ResourceElement<R, P>) => {
          const changed = state.elementRef.current !== el;
          state.elementRef.current = el;
          setElement(el);

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
  { mount = true }: { mount?: boolean } = {},
): createResource.Handle<R, P> => {
  let isMounted = mount;
  let render: RenderResult;
  const props = {
    elementRef: { current: element },
    onRender: (changed: boolean) => {
      if (isMounted) return changed;
      isMounted = true;

      flushResourcesSync(() => {
        if (changed) {
          render = renderResourceFiber(fiber, props);
        }

        if (scheduler.isDirty) return;
        commitResourceFiber(fiber, render!);
      });

      return false;
    },
    onUnmount: () => {
      if (!isMounted) throw new Error("Resource not mounted");
      isMounted = false;

      unmountResourceFiber(fiber);
    },
  };

  const scheduler = new UpdateScheduler(() => {
    render = renderResourceFiber(fiber, props);

    if (scheduler.isDirty || !isMounted) return;
    commitResourceFiber(fiber, render);
  });

  const fiber = createResourceFiber(HandleWrapperResource<R, P>, () =>
    scheduler.markDirty(),
  );

  flushResourcesSync(() => {
    scheduler.markDirty();
  });

  return render!.state;
};
