export const handleThreadListAction = (
  action: string,
  execute: () => Promise<void>,
): void => {
  try {
    void execute().catch((error: unknown) => {
      console.error(`[assistant-ui] thread list ${action} failed:`, error);
    });
  } catch (error) {
    console.error(`[assistant-ui] thread list ${action} failed:`, error);
  }
};
