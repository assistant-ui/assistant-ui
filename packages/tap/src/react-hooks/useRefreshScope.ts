import { getCurrentResourceFiber } from "../core/helpers/execution-context";
import { addCommit } from "../core/helpers/root";
import type { RefreshCell } from "../core/types";
import {
  throwHookOrderChanged,
  throwRenderedMoreHooks,
} from "./utils/hookErrors";

export function useRefreshScope<T>(token: unknown, fn: () => T): T {
  const fiber = getCurrentResourceFiber();
  const index = fiber.currentIndex++;
  let cell = fiber.cells[index];

  if (cell === undefined) {
    if (!fiber.isFirstRender) {
      throwRenderedMoreHooks();
    }

    cell = { type: "refresh", token, isCommitted: false } satisfies RefreshCell;
    fiber.cells[index] = cell;
  }

  if (cell.type !== "refresh") {
    return throwHookOrderChanged();
  }

  const refreshCell = cell;
  const isRefreshing =
    refreshCell.isCommitted && !Object.is(refreshCell.token, token);
  if (!refreshCell.isCommitted || isRefreshing) {
    addCommit(fiber, () => {
      refreshCell.token = token;
      refreshCell.isCommitted = true;
    });
  }

  const previous = fiber.isRefreshing;
  fiber.isRefreshing = previous || isRefreshing;
  try {
    return fn();
  } finally {
    fiber.isRefreshing = previous;
  }
}
