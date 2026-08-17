const reportCallbackError = (name: string, error: unknown) => {
  console.error(`[react-mcp] ${name} callback threw an error`, error);
};

export const invokeMcpCallback = <TArgs extends unknown[]>(
  name: string,
  callback: ((...args: TArgs) => void) | undefined,
  ...args: TArgs
) => {
  if (!callback) return;

  try {
    const result = callback(...args) as unknown;
    if (
      result !== null &&
      (typeof result === "object" || typeof result === "function") &&
      "then" in result &&
      typeof result.then === "function"
    ) {
      void Promise.resolve(result).catch((error) => {
        reportCallbackError(name, error);
      });
    }
  } catch (error) {
    reportCallbackError(name, error);
  }
};
