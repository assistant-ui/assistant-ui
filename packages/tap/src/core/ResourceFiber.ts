import { ResourceFn, ResourceFiber, RenderResult } from "./types";
import { commitRender, cleanupAllEffects } from "./commit";
import { withResourceFiber } from "./execution-context";

export function createResourceFiber<R, P>(
  resourceFn: ResourceFn<R, P>,
  scheduleRerender: () => void
): ResourceFiber {
  return {
    resourceFn,
    scheduleRerender,
    cells: [],
    commitTasks: [],
    currentIndex: 0,
    committedProps: undefined,
    isRendering: false,
    isFirstRender: true,
  };
}

export function unmountResource(fiber: ResourceFiber): void {
  // Clean up all effects
  cleanupAllEffects(fiber);
}

export function renderResource<R, P>(
  fiber: ResourceFiber,
  props: P
): RenderResult {
  let state: R | undefined;

  withResourceFiber(fiber, () => {
    state = fiber.resourceFn(props);
  });

  // on first render, we save the props for setState calls post render before commit
  fiber.committedProps ??= props;

  return {
    commitTasks: fiber.commitTasks,
    props,
    state,
  };
}

export function commitResource(
  fiber: ResourceFiber,
  result: RenderResult
): void {
  commitRender(result, fiber);
  fiber.committedProps = result.props;
}
