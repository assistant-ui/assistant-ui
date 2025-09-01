import { getCurrentResourceFiber } from "../core/execution-context";
import { ResourceFiber } from "../core/types";
import { tapMemo } from "./tap-memo";

export const rerender = (fiber: ResourceFiber<any, any>) => {
  if (fiber.renderContext) {
    throw new Error("Resource updated during render");
  }
  if (fiber.isNeverMounted) {
    throw new Error("Resource updated before mount");
  }
  // Only schedule rerender if currently mounted
  if (fiber.isMounted) {
    fiber.scheduleRerender();
  }
};

export const tapRerender = () => {
  const fiber = getCurrentResourceFiber();
  return tapMemo(() => rerender(fiber), []);
};
