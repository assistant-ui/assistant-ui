export function invokeUserCallback<TArgs extends readonly unknown[]>(
  tag: string,
  name: string,
  callback: ((...args: TArgs) => unknown) | undefined,
  ...args: TArgs
): void | Promise<void> {
  if (!callback) return;

  const reportError = (error: unknown) => {
    try {
      console.error(`[${tag}] ${name} callback threw an error`, error);
    } catch {}
  };

  try {
    const result = callback(...args);
    if (
      result !== null &&
      (typeof result === "object" || typeof result === "function") &&
      "then" in result &&
      typeof result.then === "function"
    ) {
      return Promise.resolve(result).then(
        () => undefined,
        (error) => reportError(error),
      );
    }
  } catch (error) {
    reportError(error);
  }
}
