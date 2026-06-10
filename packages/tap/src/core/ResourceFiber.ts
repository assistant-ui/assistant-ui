import type { ResourceFiber, RenderResult, ResourceFiberRoot } from "./types";
import { commitAllEffects, cleanupAllEffects } from "./helpers/commit";
import { withResourceFiber } from "./helpers/execution-context";
import { withReactDispatcher } from "./react-dispatcher";
import { isDevelopment } from "./helpers/env";

export function createResourceFiber<R, A extends readonly unknown[]>(
  hook: (...args: A) => R,
  root: ResourceFiberRoot,
  markDirty: (() => void) | undefined = undefined,
  strictMode: "root" | "child" | null,
): ResourceFiber<R, A> {
  return {
    hook,
    root,
    markDirty,
    devStrictMode: strictMode,
    cells: [],
    currentIndex: 0,
    renderContext: undefined,
    isFirstRender: true,
    isMounted: false,
    isNeverMounted: true,
  };
}

export function unmountResourceFiber<R, A extends readonly unknown[]>(
  fiber: ResourceFiber<R, A>,
): void {
  if (!fiber.isMounted)
    throw new Error("Tried to unmount a fiber that is already unmounted");

  fiber.isMounted = false;
  cleanupAllEffects(fiber);
}

export function renderResourceFiber<R, A extends readonly unknown[]>(
  fiber: ResourceFiber<R, A>,
  args: Readonly<A>,
): RenderResult {
  const result = {
    effectTasks: [],
    output: undefined as R | undefined,
  };

  withResourceFiber(fiber, () => {
    fiber.renderContext = result;
    try {
      result.output = withReactDispatcher(() => fiber.hook(...args));
    } finally {
      fiber.renderContext = undefined;
    }
  });

  return result;
}

export function commitResourceFiber<R, A extends readonly unknown[]>(
  fiber: ResourceFiber<R, A>,
  result: RenderResult,
): void {
  fiber.isMounted = true;

  if (isDevelopment && fiber.isNeverMounted && fiber.devStrictMode === "root") {
    fiber.isNeverMounted = false;

    commitAllEffects(result);
    cleanupAllEffects(fiber);
  }

  fiber.isNeverMounted = false;
  commitAllEffects(result);
}
