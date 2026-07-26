type EventListener = (payload?: unknown) => void;

export const notifyEventListeners = (
  listeners: Iterable<EventListener>,
  payload: unknown,
  errorContext: string,
) => {
  const reportError = (error: unknown) => {
    console.error(
      `[assistant-ui] ${errorContext} listener threw an error`,
      error,
    );
  };

  for (const listener of listeners) {
    try {
      const result = listener(payload) as unknown;
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
