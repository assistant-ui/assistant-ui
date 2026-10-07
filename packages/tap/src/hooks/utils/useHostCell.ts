import { getCurrentResourceFiber } from "../../core/helpers/execution-context";
import { addCommit } from "../../core/helpers/root";
import type { HostCell, ResourceFiber } from "../../core/types";
import {
  throwHookOrderChanged,
  throwRenderedMoreHooks,
} from "../../react-hooks/utils/hookErrors";

export type HostTarget =
  | ResourceFiber<unknown>
  | NonNullable<HostCell["fibers"]>;

export const useHostCell = (target: HostTarget): HostCell => {
  const parent = getCurrentResourceFiber();
  const index = parent.currentIndex++;
  const existing = parent.cells[index];
  let cell: HostCell;

  if (existing === undefined) {
    if (!parent.isFirstRender) throwRenderedMoreHooks();
    const isMap = target instanceof Map;
    cell = {
      type: "host",
      fiber: isMap ? null : target,
      fibers: isMap ? target : null,
    };
    parent.cells[index] = cell;
    (parent.hostCells ??= []).push(cell);
  } else {
    if (existing.type !== "host") throwHookOrderChanged();
    cell = existing as HostCell;
  }

  if (cell.fibers === null && cell.fiber !== target) {
    addCommit(parent, () => {
      cell.fiber = target as ResourceFiber<unknown>;
    });
  }

  return cell;
};
