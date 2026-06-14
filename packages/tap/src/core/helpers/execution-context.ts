import type { ResourceFiber } from "../types";

let currentResourceFiber: ResourceFiber<any, any> | null = null;

export function withResourceFiber<R, A extends readonly unknown[]>(
  fiber: ResourceFiber<R, A>,
  fn: () => void,
): void {
  fiber.currentIndex = 0;
  fiber.wipContextDeps = null;
  fiber.wipCommitCallbacks = [];

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
export function getCurrentResourceFiber(): ResourceFiber<unknown> {
  if (!currentResourceFiber) {
    throw new Error("No resource fiber available");
  }
  return currentResourceFiber;
}

export function peekResourceFiber(): ResourceFiber<unknown> | null {
  return currentResourceFiber;
}
