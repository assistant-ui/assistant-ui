import { isDevelopment } from "../core/helpers/env";
import { getCurrentResourceFiber } from "../core/helpers/execution-context";
import { addCommit, addRollback } from "../core/helpers/root";
import { CommitPriority } from "../core/helpers/commit";
import type { MemoCell, ResourceFiber } from "../core/types";
import { depsShallowEqual } from "../hooks/utils/depsShallowEqual";
import {
  throwHookOrderChanged,
  throwRenderedMoreHooks,
} from "./utils/hookErrors";

const addMemoCommit = <T>(
  fiber: ResourceFiber<any, any>,
  cell: MemoCell<T>,
) => {
  addCommit(fiber, CommitPriority.HookState, () => {
    cell.current = cell.wip;
    cell.currentDeps = cell.wipDeps;
    cell.isDirty = false;
  });
};

export const useMemo = <T>(fn: () => T, deps: readonly unknown[]): T => {
  const fiber = getCurrentResourceFiber();
  const index = fiber.currentIndex++;
  let cell = fiber.cells[index];

  if (cell === undefined) {
    if (!fiber.isFirstRender && index >= fiber.cells.length) {
      throwRenderedMoreHooks();
    }

    const value = fn();

    if (isDevelopment && fiber.devStrictMode) {
      void fn();
    }

    cell = {
      type: "memo",
      current: value,
      currentDeps: deps,
      wip: value,
      wipDeps: deps,
      isDirty: false,
    } satisfies MemoCell<T>;
    fiber.cells[index] = cell;
    return value;
  }

  if (cell.type !== "memo") {
    throwHookOrderChanged();
  }

  const memoCell = cell as MemoCell<T>;
  if (depsShallowEqual(memoCell.wipDeps, deps)) {
    if (memoCell.isDirty) {
      addMemoCommit(fiber, memoCell);
    }
    return memoCell.wip;
  }

  const value = fn();

  if (isDevelopment && fiber.devStrictMode) {
    void fn();
  }

  memoCell.wip = value;
  memoCell.wipDeps = deps;

  if (!memoCell.isDirty) {
    memoCell.isDirty = true;
    addRollback(fiber.root, () => {
      memoCell.wip = memoCell.current;
      memoCell.wipDeps = memoCell.currentDeps;
      memoCell.isDirty = false;
    });
  }
  addMemoCommit(fiber, memoCell);

  return value;
};
