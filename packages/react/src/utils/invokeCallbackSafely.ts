export const invokeCallbackSafely = <T>(
  callback: ((value: T) => void) | undefined,
  value: T,
  name: string,
) => {
  if (!callback) return;

  const reportFailure = (error: unknown) => {
    console.error(`[assistant-ui] ${name} callback threw an error`, error);
  };

  try {
    void Promise.resolve(callback(value)).catch(reportFailure);
  } catch (error) {
    reportFailure(error);
  }
};
