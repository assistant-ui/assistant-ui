import { ResourceFiber } from "./types";

let currentResourceFiber: ResourceFiber | null = null;

export function withResourceFiber(fiber: ResourceFiber, fn: () => void): void {
  if (fiber.isRendering) throw new Error("Execution context is locked");
  fiber.isRendering = true;
  fiber.commitTasks = [];
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
          "Hooks must be called in the exact same order in every render."
      );
    }
  } finally {
    currentResourceFiber = previousContext;
    fiber.isRendering = false;
  }
}
export function getCurrentResourceFiber(): ResourceFiber {
  if (!currentResourceFiber) {
    throw new Error("No resource fiber available");
  }
  return currentResourceFiber;
}
