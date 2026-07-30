type EventListener<T> = (payload: T) => unknown;

export const notifyEventListeners = <T>(
  listeners: Iterable<EventListener<T>>,
  payload: T,
  errorContext: string,
  createPayload: (() => T) | undefined = undefined,
) => {
  const reportError = (error: unknown) => {
    console.error(
      `[assistant-ui] ${errorContext} listener threw an error`,
      error,
    );
  };

  for (const listener of listeners) {
    try {
      const result = listener(createPayload ? createPayload() : payload);
      if (
        result !== null &&
        (typeof result === "object" || typeof result === "function") &&
        "then" in result &&
        typeof result.then === "function"
      ) {
        void Promise.resolve(result).catch(reportError);
      }
    } catch (error) {
      reportError(error);
    }
  }
};
