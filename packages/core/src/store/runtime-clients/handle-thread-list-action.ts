export const handleThreadListAction = (
  action: string,
  execute: () => Promise<void>,
): Promise<void> => {
  let task: Promise<void>;
  try {
    task = execute();
  } catch (error) {
    console.error(`[assistant-ui] thread list ${action} failed:`, error);
    throw error;
  }

  void task.catch((error: unknown) => {
    console.error(`[assistant-ui] thread list ${action} failed:`, error);
  });
  return task;
};
