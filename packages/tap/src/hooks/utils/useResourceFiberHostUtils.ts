import {
  useRef,
  useMemo,
  useReducer,
  useState,
  useCallback,
  useEffect,
  useInsertionEffect,
} from "react";
import {
  getCurrentResourceFiber,
  peekResourceFiber,
} from "../../core/helpers/execution-context";
import {
  createResourceFiberRoot,
  setRootVersion,
} from "../../core/helpers/root";
import {
  createResourceFiber,
  unmountResourceFiber,
  unmountResourceFibers,
} from "../../core/ResourceFiber";
import { useDevStrictMode } from "./useDevStrictMode";
import { useHostCell, type HostTarget } from "./useHostCell";
import type { HostCell, ResourceFiber } from "../../core/types";

const forEachHostedFiber = (
  target: HostTarget,
  visit: (fiber: ResourceFiber<unknown>) => void,
): void => {
  if (!(target instanceof Map)) return visit(target);
  for (const { fiber } of target.values()) visit(fiber);
};

const acquire = (fiber: ResourceFiber<unknown>) => {
  fiber.isReleased = false;
};

const release = (fiber: ResourceFiber<unknown>) => {
  fiber.isReleased = true;
  if (!fiber.isMounted) {
    queueMicrotask(() => {
      if (fiber.isReleased) unmountResourceFiber(fiber, true);
    });
  }
};

const useHostLifecycleReact = (target: HostTarget): void => {
  useInsertionEffect(() => {
    forEachHostedFiber(target, acquire);
    return () => forEachHostedFiber(target, release);
  }, [target]);

  useEffect(
    () => () => {
      unmountResourceFibers(
        target instanceof Map
          ? Array.from(target.values(), ({ fiber }) => fiber)
          : [target],
      );
    },
    [target],
  );
};

export const useHostLifecycle = (target: HostTarget): HostCell | null => {
  if (peekResourceFiber()) {
    // oxlint-disable-next-line react-hooks/rules-of-hooks
    return useHostCell(target);
  } else {
    // oxlint-disable-next-line react-hooks/rules-of-hooks
    useHostLifecycleReact(target);
    return null;
  }
};

const useResourceFiberHostUtilsTap = () => {
  const versionRef = useRef(0);
  const version = versionRef.current;
  const parent = getCurrentResourceFiber();
  const markDirty = useMemo(
    () => () => {
      versionRef.current++;
      parent.markDirty?.();
    },
    [parent],
  );

  return { version, markDirty, root: parent.root };
};

const useResourceFiberHostUtilsReact = () => {
  const [root] = useState(() => {
    return createResourceFiberRoot((evaluateUpdate, applyUpdate) => {
      let eagerBail = false;

      evaluate((version) => {
        eagerBail = !evaluateUpdate();
        return eagerBail ? version : version + 1;
      });

      // React runs the updater above eagerly only while this fiber has no
      // pending work, so the reducer repeats the evaluation it may have skipped.
      if (!eagerBail) {
        apply(() => evaluateUpdate() && applyUpdate());
      }
    });
  });

  const [version, apply] = useReducer(
    (v: number, applyUpdate: () => boolean) => {
      setRootVersion(root!, v);
      return v + (applyUpdate() ? 1 : 0);
    },
    0,
  );
  const [, evaluate] = useState(0);
  setRootVersion(root, version);

  return { root, version, markDirty: undefined };
};

export const useResourceFiberHost = () => {
  const getDevMode = useDevStrictMode();
  const { root, version, markDirty } = peekResourceFiber()
    ? // oxlint-disable-next-line react-hooks/rules-of-hooks
      useResourceFiberHostUtilsTap()
    : // oxlint-disable-next-line react-hooks/rules-of-hooks
      useResourceFiberHostUtilsReact();

  const createFiber = useCallback(
    <R, A extends readonly any[]>(
      hook: (...props: A) => R,
      _key: string | number | undefined,
      // Per-fiber dirty callback, fired before the host's markDirty (which
      // bumps versions up the tree). Lets a host track which child needs work.
      onDirty?: () => void,
    ) => {
      const fiberMarkDirty = onDirty
        ? () => {
            onDirty();
            markDirty?.();
          }
        : markDirty;
      return createResourceFiber(hook, root, fiberMarkDirty, getDevMode());
    },
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { version, createFiber };
};
