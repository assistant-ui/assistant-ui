export function withPromiseOrValue<T>(
  callback: () => T | PromiseLike<T>,
  thenHandler: (value: T) => void,
  catchHandler: (error: unknown) => void,
): void {
  try {
    const promiseOrValue = callback();
    if (
      typeof promiseOrValue === "object" &&
      promiseOrValue !== null &&
      "then" in promiseOrValue
    ) {
      promiseOrValue.then(thenHandler, catchHandler);
    } else {
      thenHandler(promiseOrValue);
    }
  } catch (e) {
    catchHandler(e);
  }
}
