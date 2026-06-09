import { useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import type { ResourceFiberRoot, Resource } from "../core/types";
import {
  createResourceFiber,
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";
import { isDevelopment } from "../core/helpers/env";
import {
  commitRoot,
  createResourceFiberRoot,
  setRootVersion,
} from "../core/helpers/root";
import { peekResourceFiber } from "../core/helpers/execution-context";
import * as hooks from "../hooks";
import { resource } from "../core/resource";

const useDevStrictMode = () => {
  if (!isDevelopment) return null;

  // oxlint-disable-next-line react/rules-of-hooks -- isDevelopment is a build-time constant, so this branch is stable per build
  const count = useRef(0);
  const isFirstRender = count.current === 0;
  // oxlint-disable-next-line react/rules-of-hooks -- isDevelopment is a build-time constant, so this branch is stable per build
  useState(() => count.current++);
  if (count.current !== 2) return null;
  return isFirstRender ? ("child" as const) : ("root" as const);
};

const useHostResource = <T>(callback: () => T) => {
  return callback();
};

const HostResource = resource(useHostResource);

// Runs `callback` inside a resource render hosted by a React component, so the
// resource composition hooks (useResource/useResources/useTapRoot) work from
// React. `callback` executes inside the resource fiber below, so it may only call
// resource hooks, not React's own hooks (which would have no fiber to attach to).
// This is the single React->resource bridge; the React branch of every public
// hook goes through it.
const useResourceHost = <T>(callback: () => T): T => {
  const root = useMemo<ResourceFiberRoot>(() => {
    return createResourceFiberRoot((cb) => dispatch(cb));
  }, []);

  const [version, dispatch] = useReducer((v: number, cb: () => boolean) => {
    setRootVersion(root, v);
    return v + (cb() ? 1 : 0);
  }, 0);
  setRootVersion(root, version);

  const devStrictMode = useDevStrictMode();
  const fiber = useMemo(() => {
    return createResourceFiber(
      HostResource as unknown as Resource<T, () => T>,
      root,
      undefined,
      devStrictMode,
    );
  }, [root, devStrictMode]);

  const result = renderResourceFiber(fiber, callback);
  useLayoutEffect(() => {
    return () => unmountResourceFiber(fiber);
  }, [fiber]);
  useLayoutEffect(() => {
    commitRoot(root);
    commitResourceFiber(fiber, result);
  });

  return result.output;
};

// Turns a resource hook into an isomorphic hook with the SAME type (overloads
// included): inside a resource render it calls the hook directly; inside a React
// component it hosts it via the `useResourceHost` bridge. peekResourceFiber() is
// stable per call site (a given call always renders in the same environment), so
// the branch order across renders is fixed even though rules-of-hooks can't prove
// it.
const makeHook = <F extends (...args: any[]) => any>(hook: F): F =>
  ((...args: any[]) => {
    /* oxlint-disable react/rules-of-hooks */
    if (peekResourceFiber()) return hook(...args);
    return useResourceHost(() => hook(...args));
    /* oxlint-enable react/rules-of-hooks */
  }) as F;

/**
 * Hosts a resource element. Inside a resource render it hosts the element as a
 * child resource; inside a React component it hosts it via the React bridge.
 * `propsDeps` is a resource-render optimization and is ignored on the React side.
 */
export const useResource: typeof hooks.useResource = makeHook(
  hooks.useResource,
);

/**
 * Hosts a keyed list of resource elements. Inside a resource render it composes
 * them directly; inside a React component it hosts them via the React bridge.
 */
export const useResources: typeof hooks.useResources = makeHook(
  hooks.useResources,
);

/**
 * Hosts a callback as a subscribable root. Inside a resource render it uses the
 * root hook directly; inside a React component it hosts that root via the React
 * bridge (host it in one place; observe it via getState/subscribe).
 */
export const useTapRoot: typeof hooks.useTapRoot = makeHook(hooks.useTapRoot);
