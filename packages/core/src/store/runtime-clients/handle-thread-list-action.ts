export const handleThreadListAction = (
  action: string,
  execute: () => Promise<void>,
): Promise<void> => {
  const task = execute();

  void task.catch((error: unknown) => {
    console.error(`[assistant-ui] thread list ${action} failed:`, error);
  });
  return task;
};
