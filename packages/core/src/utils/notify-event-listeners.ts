type EventListener<T> = (payload: T) => unknown;

// A function payload is indistinguishable from a factory and gets invoked; wrap a function-typed payload in a factory.
export const notifyEventListeners = <T>(
  listeners: Iterable<EventListener<T>>,
  payloadOrFactory: T | (() => T),
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
      const result = listener(
        typeof payloadOrFactory === "function"
          ? (payloadOrFactory as () => T)()
          : payloadOrFactory,
      );
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
