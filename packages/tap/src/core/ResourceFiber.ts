import { ResourceFiber, RenderResult, Resource } from "./types";
import { commitRender, cleanupAllEffects } from "./commit";
import { getDevStrictMode, withResourceFiber } from "./execution-context";
import { callResourceFn } from "./callResourceFn";
import { isDevelopment } from "./env";

export function createResourceFiber<R, P>(
  type: Resource<R, P>,
  dispatchUpdate: (callback: () => boolean) => void,
  strictMode: "root" | "child" | null = getDevStrictMode(false),
): ResourceFiber<R, P> {
  return {
    type,
    dispatchUpdate,
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
    commitTasks: [],
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
    commitRender(result);
    cleanupAllEffects(fiber);
  }

  fiber.isNeverMounted = false;
  commitRender(result);
}
