// Rejects as soon as the signal aborts; a started operation keeps running.
export const abortable = <T>(signal: AbortSignal, start: () => Promise<T>) =>
  new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    if (signal.aborted) return onAbort();
    signal.addEventListener("abort", onAbort, { once: true });
    void start()
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", onAbort));
  });
