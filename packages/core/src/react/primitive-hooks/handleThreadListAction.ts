export const handleThreadListAction = (
  action: string,
  execute: () => void | Promise<void>,
): Promise<void> => {
  let task: Promise<void>;

  try {
    task = Promise.resolve(execute());
  } catch (error) {
    task = Promise.reject(error);
  }

  void task.catch((error: unknown) => {
    console.error(`[assistant-ui] thread list ${action} failed:`, error);
  });

  return task;
};
