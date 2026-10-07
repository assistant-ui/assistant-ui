const getAbortReason = (signal: AbortSignal): unknown => {
  if (signal.reason !== undefined) return signal.reason;
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
};

export const raceWithAbortSignal = <T>(
  signal: AbortSignal | undefined,
  operation: () => T | PromiseLike<T>,
): Promise<T> => {
  if (!signal) {
    try {
      return Promise.resolve(operation());
    } catch (error) {
      return Promise.reject(error);
    }
  }
  if (signal.aborted) return Promise.reject(getAbortReason(signal));

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const cleanup = () => signal.removeEventListener("abort", handleAbort);
    const resolveOnce = (value: T) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };
    const rejectOnce = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const handleAbort = () => rejectOnce(getAbortReason(signal));

    signal.addEventListener("abort", handleAbort, { once: true });
    let result: T | PromiseLike<T>;
    try {
      result = operation();
    } catch (error) {
      rejectOnce(error);
      return;
    }
    Promise.resolve(result).then(resolveOnce, rejectOnce);
  });
};
