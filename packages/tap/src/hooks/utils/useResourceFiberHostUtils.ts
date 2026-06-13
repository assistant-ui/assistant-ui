import { useRef, useMemo, useReducer, useState, useCallback } from "react";
import {
  getCurrentResourceFiber,
  peekResourceFiber,
} from "../../core/helpers/execution-context";
import {
  createResourceFiberRoot,
  setRootVersion,
} from "../../core/helpers/root";
import { createResourceFiber } from "../../core/ResourceFiber";
import { useDevStrictMode } from "./useDevStrictMode";

const useResourceFiberHostUtilsTap = () => {
  const versionRef = useRef(0);
  const version = versionRef.current;
  const parent = getCurrentResourceFiber();
  const markDirty = useMemo(
    () => () => {
      versionRef.current++;
      parent?.markDirty?.();
    },
    [parent],
  );

  return { version, markDirty, root: parent.root };
};

const useResourceFiberHostUtilsReact = () => {
  const root = useMemo(() => {
    return createResourceFiberRoot((evaluateUpdate, applyUpdate) => {
      let eagerBail = false;

      evaluate((version) => {
        eagerBail = !evaluateUpdate();
        return eagerBail ? version : version + 1;
      });

      if (!eagerBail) {
        apply(applyUpdate);
      }
    });
  }, []);

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
