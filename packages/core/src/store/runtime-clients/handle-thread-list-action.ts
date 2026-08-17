import { handleRuntimeAction } from "./handle-runtime-action";

export const handleThreadListAction = (
  action: string,
  execute: () => Promise<void>,
): Promise<void> => handleRuntimeAction(`thread list ${action}`, execute);
