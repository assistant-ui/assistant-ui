export const handleRuntimeAction = (
  label: string,
  execute: () => Promise<void>,
): Promise<void> => {
  const task = execute();

  void task.catch((error: unknown) => {
    console.error(`[assistant-ui] ${label} failed:`, error);
  });
  return task;
};
