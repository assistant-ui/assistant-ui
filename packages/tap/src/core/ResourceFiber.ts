import {
  ResourceFiber,
  RenderResult,
  Resource,
  ResourceFiberRoot,
} from "./types";
import { commitAllEffects, cleanupAllEffects } from "./helpers/commit";
import {
  getDevStrictMode,
  withResourceFiber,
} from "./helpers/execution-context";
import { callResourceFn } from "./helpers/callResourceFn";
import { isDevelopment } from "./helpers/env";

export function createResourceFiber<R, P>(
  type: Resource<R, P>,
  root: ResourceFiberRoot,
  markDirty: (() => void) | undefined = undefined,
  strictMode: "root" | "child" | null = getDevStrictMode(false),
): ResourceFiber<R, P> {
  return {
    type,
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

export function unmountResourceFiber<R, P>(fiber: ResourceFiber<R, P>): void {
  if (!fiber.isMounted)
    throw new Error("Tried to unmount a fiber that is already unmounted");

  fiber.isMounted = false;
  cleanupAllEffects(fiber);
}

export function renderResourceFiber<R, P>(
  fiber: ResourceFiber<R, P>,
  props: P,
): RenderResult {
  const result = {
    effectTasks: [],
    props,
    output: undefined as R | undefined,
  };

  withResourceFiber(fiber, () => {
    fiber.renderContext = result;
    try {
      result.output = callResourceFn(fiber.type, props);
    } finally {
      fiber.renderContext = undefined;
    }
  });

  return result;
}

export function commitResourceFiber<R, P>(
  fiber: ResourceFiber<R, P>,
  result: RenderResult,
): void {
  fiber.isMounted = true;

  if (isDevelopment && fiber.isNeverMounted && fiber.devStrictMode === "root") {
    commitAllEffects(result);
    cleanupAllEffects(fiber);
  }

  fiber.isNeverMounted = false;
  commitAllEffects(result);
}
