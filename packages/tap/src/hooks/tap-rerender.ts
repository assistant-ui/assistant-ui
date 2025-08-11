import { getCurrentResourceFiber } from "../core/execution-context";

export const tapRerender = () => {
  const executionContext = getCurrentResourceFiber();
  return executionContext.scheduleRerender;
};
