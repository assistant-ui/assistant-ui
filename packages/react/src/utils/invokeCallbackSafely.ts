export const invokeCallbackSafely = (invoke: () => unknown, name: string) => {
  const reportFailure = (error: unknown) => {
    console.error(`[assistant-ui] ${name} callback threw an error`, error);
  };

  try {
    void Promise.resolve(invoke()).catch(reportFailure);
  } catch (error) {
    reportFailure(error);
  }
};
