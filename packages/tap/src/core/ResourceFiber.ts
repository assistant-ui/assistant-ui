import { ResourceFiber, RenderResult, Resource } from "./types";
import { commitRender, cleanupAllEffects } from "./commit";
import { withResourceFiber } from "./execution-context";
import { callResourceFn } from "./callResourceFn";

export function createResourceFiber<R, P>(
  resource: Resource<R, P>,
  scheduleRerender: () => void,
): ResourceFiber<R, P> {
  return {
    resource,
    scheduleRerender,
    cells: [],
    currentIndex: 0,
    renderContext: undefined,
    isFirstRender: true,
    isMounted: false,
    isNeverMounted: true,
  };
}

export function unmountResourceFiber<R, P>(fiber: ResourceFiber<R, P>): void {
  // Clean up all effects
  fiber.isMounted = false;
  cleanupAllEffects(fiber);
}

export function renderResourceFiber<R, P>(
  fiber: ResourceFiber<R, P>,
  props: P,
): RenderResult {
  const result: RenderResult = {
    commitTasks: [],
    props,
    state: undefined,
  };

  withResourceFiber(fiber, () => {
    fiber.renderContext = result;
    try {
      result.state = callResourceFn(fiber.resource, props);
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
  fiber.isNeverMounted = false;

  commitRender(result, fiber);
}
