import { ResourceFn, ResourceFiber, RenderResult } from "./types";
import { commitRender, cleanupAllEffects } from "./commit";
import { withResourceFiber } from "./execution-context";

export function createResourceFiber<R, P>(
  resourceFn: ResourceFn<R, P>,
  scheduleRerender: () => void,
): ResourceFiber<R, P> {
  return {
    resourceFn,
    scheduleRerender,
    cells: [],
    currentIndex: 0,
    renderContext: undefined,
    isFirstRender: true,
    isMounted: false,
    isNeverMounted: true,
  };
}

export function unmountResource<R, P>(fiber: ResourceFiber<R, P>): void {
  // Clean up all effects
  fiber.isMounted = false;
  cleanupAllEffects(fiber);
}

export function renderResource<R, P>(
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
      result.state = fiber.resourceFn(props);
    } finally {
      fiber.renderContext = undefined;
    }
  });

  return result;
}

export function commitResource<R, P>(
  fiber: ResourceFiber<R, P>,
  result: RenderResult,
): void {
  fiber.isMounted = true;
  fiber.isNeverMounted = false;

  commitRender(result, fiber);
}
