import { getCurrentResourceFiber } from "../core/helpers/execution-context";
import {
  throwHookOrderChanged,
  throwRenderedMoreHooks,
} from "./utils/hookErrors";

export namespace useRef {
  export interface RefObject<T> {
    current: T;
  }
}

export function useRef<T>(initialValue: T): useRef.RefObject<T>;
export function useRef<T = undefined>(): useRef.RefObject<T | undefined>;
export function useRef<T>(initialValue?: T): useRef.RefObject<T | undefined> {
  const fiber = getCurrentResourceFiber();
  const index = fiber.currentIndex++;
  const cell = fiber.cells[index];

  if (cell === undefined) {
    if (!fiber.isFirstRender) {
      throwRenderedMoreHooks();
    }

    const ref = { current: initialValue };
    fiber.cells[index] = { type: "ref", ref };
    return ref;
  }

  if (cell.type !== "ref") {
    return throwHookOrderChanged();
  }

  return cell.ref;
}
