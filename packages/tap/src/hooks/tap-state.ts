import { getCurrentResourceFiber } from "../core/execution-context";
import { Cell, ResourceFiber } from "../core/types";

export namespace tapState {
  export type StateUpdater<S> = S | ((prev: S) => S);
}

const rerender = (fiber: ResourceFiber<any, any>) => {
  if (fiber.renderContext) {
    throw new Error("Resource updated during render");
  }

  if (fiber.isMounted) {
    // Only schedule rerender if currently mounted
    fiber.scheduleRerender();
  } else if (fiber.isNeverMounted) {
    throw new Error("Resource updated before mount");
  }
};

function getStateCell<T>(
  initialValue: T | (() => T),
): Cell & { type: "state" } {
  const fiber = getCurrentResourceFiber();
  const index = fiber.currentIndex++;

  // Check if we're trying to use more hooks than in previous renders
  if (!fiber.isFirstRender && index >= fiber.cells.length) {
    throw new Error(
      "Rendered more hooks than during the previous render. " +
        "Hooks must be called in the exact same order in every render.",
    );
  }

  if (!fiber.cells[index]) {
    // Initialize the value immediately
    const value =
      typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue;

    const cell: Cell & { type: "state" } = {
      type: "state",
      value,
      set: (updater: tapState.StateUpdater<T>) => {
        const currentValue = cell.value;
        const nextValue =
          typeof updater === "function"
            ? (updater as (prev: T) => T)(currentValue)
            : updater;

        if (!Object.is(currentValue, nextValue)) {
          cell.value = nextValue;
          rerender(fiber);
        }
      },
    };

    fiber.cells[index] = cell;
  }

  const cell = fiber.cells[index];
  if (cell.type !== "state") {
    throw new Error("Hook order changed between renders");
  }

  return cell as Cell & { type: "state" };
}

export function tapState<S = undefined>(): [
  S | undefined,
  (updater: tapState.StateUpdater<S>) => void,
];
export function tapState<S>(
  initial: S | (() => S),
): [S, (updater: tapState.StateUpdater<S>) => void];
export function tapState<S>(
  initial?: S | (() => S),
): [S | undefined, (updater: tapState.StateUpdater<S>) => void] {
  const cell = getStateCell(initial as S | (() => S));

  return [cell.value, cell.set];
}
