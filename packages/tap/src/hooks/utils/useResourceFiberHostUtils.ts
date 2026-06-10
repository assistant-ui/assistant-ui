import { useRef, useMemo, useReducer, useCallback } from "react";
import {
  getCurrentResourceFiber,
  peekResourceFiber,
} from "../../core/helpers/execution-context";
import {
  createResourceFiberRoot,
  setRootVersion,
} from "../../core/helpers/root";
import { createResourceFiber } from "../../core/ResourceFiber";
import type { ResourceFiberRoot } from "../../core/types";
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
  const root = useMemo<ResourceFiberRoot>(() => {
    return createResourceFiberRoot((cb) => dispatch(cb));
  }, []);

  const [version, dispatch] = useReducer((v: number, cb: () => boolean) => {
    setRootVersion(root!, v);
    return v + (cb() ? 1 : 0);
  }, 0);
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
    <R, A extends readonly any[]>(hook: (...props: A) => R) =>
      createResourceFiber(hook, root, markDirty, getDevMode()),
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { version, createFiber };
};
