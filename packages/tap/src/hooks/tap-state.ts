import { getCurrentResourceFiber } from "../core/execution-context";
import { StateUpdater, Cell } from "../core/types";

function getStateCell<T>(
  initialValue: T | (() => T)
): Cell & { type: "state" } {
  const executionContext = getCurrentResourceFiber();
  const index = executionContext.currentIndex++;

  // Check if we're trying to use more hooks than in previous renders
  if (
    !executionContext.isFirstRender &&
    index >= executionContext.cells.length
  ) {
    throw new Error(
      "Rendered more hooks than during the previous render. " +
        "Hooks must be called in the exact same order in every render."
    );
  }

  if (!executionContext.cells[index]) {
    // Initialize the value immediately
    const value =
      typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue;

    const cell: Cell & { type: "state" } = {
      type: "state",
      value,
      set: (updater: StateUpdater<T>) => {
        const currentValue = cell.value;
        const nextValue =
          typeof updater === "function"
            ? (updater as (prev: T) => T)(currentValue)
            : updater;

        if (!Object.is(currentValue, nextValue)) {
          cell.value = nextValue;

          // Check if called during render (not allowed)
          if (executionContext.isRendering) {
            throw new Error("Resource updated during render");
          }
          executionContext.scheduleRerender();
        }
      },
    };

    executionContext.cells[index] = cell;
  }

  const cell = executionContext.cells[index];
  if (cell.type !== "state") {
    throw new Error("Hook order changed between renders");
  }

  return cell as Cell & { type: "state" };
}

export function tapState<S = undefined>(): [
  S | undefined,
  (updater: StateUpdater<S>) => void
];
export function tapState<S>(
  initial: S | (() => S)
): [S, (updater: StateUpdater<S>) => void];
export function tapState<S>(
  initial?: S | (() => S)
): [S | undefined, (updater: StateUpdater<S>) => void] {
  const cell = getStateCell(initial as S | (() => S));

  return [cell.value, cell.set];
}
