import {
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";
import { useResourceFiberHost } from "./utils/useResourceFiberHostUtils";
import { useEffect, useMemo } from "react";

export namespace useTapHost {
  export interface Result<R> {
    /**
     * The current render output of the host resource.
     */
    value: R;

    /**
     * Commits the host's pending render result. Pass to a deps-less
     * useEffect in a descendant component to land the commit ahead of
     * the descendants' own effects; the first instance to run wins. A
     * plain callback (not a hook) so React Compiler can compile the
     * consumer; its identity changes on every host render.
     */
    effects: () => void;
  }
}

const useHostRender = <R>(render: () => R): R => render();

export const useTapHost = <R>(callback: () => R): useTapHost.Result<R> => {
  const { createFiber } = useResourceFiberHost();
  const fiber = useMemo(
    () => createFiber(useHostRender<R>, undefined),
    [createFiber],
  );

  const render = renderResourceFiber(fiber, [callback]);

  useEffect(() => {
    return () => {
      unmountResourceFiber(fiber);
    };
  }, [fiber]);

  let renderCommitted = false;
  const effects = () => {
    // !isMounted: StrictMode/Activity replays effects without a re-render
    // after unmounting the fiber; the replay must recommit it.
    if (renderCommitted && fiber.isMounted) return;
    renderCommitted = true;

    commitResourceFiber(fiber);
  };

  useEffect(effects);

  return {
    value: render as R,
    effects,
  };
};
