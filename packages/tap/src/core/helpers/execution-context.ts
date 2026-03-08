import { isDevelopment } from "./env";
import { ResourceFiber } from "../types";

let currentResourceFiber: ResourceFiber<any, any> | null = null;

export function withResourceFiber<R, P>(
  fiber: ResourceFiber<R, P>,
  fn: () => void,
): void {
  fiber.currentIndex = 0;

  const previousContext = currentResourceFiber;
  currentResourceFiber = fiber;
  try {
    fn();

    fiber.isFirstRender = false;

    // ensure hook count matches
    if (fiber.cells.length !== fiber.currentIndex) {
      throw new Error(
        `Rendered ${fiber.currentIndex} hooks but expected ${fiber.cells.length}. ` +
          "Hooks must be called in the exact same order in every render.",
      );
    }
  } finally {
    currentResourceFiber = previousContext;
  }
}
export function getCurrentResourceFiber(): ResourceFiber<unknown, unknown> {
  if (!currentResourceFiber) {
    throw new Error("No resource fiber available");
  }
  return currentResourceFiber;
}

export function getDevStrictMode(enable: boolean) {
  if (!isDevelopment) return null;
  if (currentResourceFiber?.devStrictMode)
    return currentResourceFiber.isFirstRender ? "child" : "root";

  return enable ? "root" : null;
}
