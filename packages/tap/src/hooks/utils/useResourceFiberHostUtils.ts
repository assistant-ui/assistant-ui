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
} from "../../core/ResourceFiber";
import { useDevStrictMode } from "./useDevStrictMode";
import { useHostCell, type HostTarget } from "./useHostCell";
import { throwAggregated } from "../../core/helpers/throwAggregated";
import type { HostCell } from "../../core/types";

const getHostedFibers = (target: HostTarget) =>
  target instanceof Map ? target.values() : [{ fiber: target }];

const useHostLifecycleReact = (target: HostTarget): void => {
  useInsertionEffect(() => {
    for (const { fiber } of getHostedFibers(target)) fiber.isReleased = false;
    return () => {
      for (const { fiber } of getHostedFibers(target)) {
        fiber.isReleased = true;
        if (!fiber.isMounted) {
          queueMicrotask(() => {
            if (fiber.isReleased) unmountResourceFiber(fiber, true);
          });
        }
      }
    };
  }, [target]);

  useEffect(
    () => () => {
      let errors: unknown[] | undefined;
      for (const { fiber } of getHostedFibers(target)) {
        try {
          unmountResourceFiber(fiber, fiber.isReleased);
        } catch (error) {
          (errors ??= []).push(error);
        }
      }
      if (errors !== undefined)
        throwAggregated(errors, "Errors during cleanup");
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
