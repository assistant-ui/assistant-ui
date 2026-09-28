import { unmountResourceFiber } from "../../core/ResourceFiber";
import { getCurrentResourceFiber } from "../../core/helpers/execution-context";
import { addCommit } from "../../core/helpers/root";
import type { HostCell, ResourceFiber } from "../../core/types";
import { useEffect } from "../../react-hooks/useEffect";
import {
  throwHookOrderChanged,
  throwRenderedMoreHooks,
} from "../../react-hooks/utils/hookErrors";

export type HostTarget =
  | ResourceFiber<unknown>
  | NonNullable<HostCell["fibers"]>;

export const useHostCell = (target: HostTarget): void => {
  const parent = getCurrentResourceFiber();
  const index = parent.currentIndex++;
  const existing = parent.cells[index];
  let cell: HostCell;

  if (existing === undefined) {
    if (!parent.isFirstRender) throwRenderedMoreHooks();
    cell = {
      type: "host",
      fiber: target instanceof Map ? null : target,
      fibers: target instanceof Map ? target : null,
    };
    parent.cells[index] = cell;
    (parent.hostCells ??= []).push(cell);
  } else {
    if (existing.type !== "host") throwHookOrderChanged();
    cell = existing as HostCell;
  }

  if (!(target instanceof Map) && cell.fiber !== target) {
    addCommit(parent, () => {
      cell.fiber = target;
    });
  }

  useEffect(
    () => () => {
      if (!(target instanceof Map) && cell.fiber !== target) {
        unmountResourceFiber(target, true);
      }
    },
    [cell, target],
  );
};
