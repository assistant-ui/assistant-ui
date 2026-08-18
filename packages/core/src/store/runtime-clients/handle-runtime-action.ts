import { isSilentRuntimeAction } from "../../runtimes/remote-thread-list/adapter-changed";

export const handleRuntimeAction = (
  label: string,
  execute: () => Promise<void>,
): Promise<void> => {
  const task = execute();

  void task.catch((error: unknown) => {
    if (isSilentRuntimeAction(error)) return;
    console.error(`[assistant-ui] ${label} failed:`, error);
  });
  return task;
};
