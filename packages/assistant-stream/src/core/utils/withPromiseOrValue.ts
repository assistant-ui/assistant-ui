export function withPromiseOrValue<T>(
  callback: () => T | PromiseLike<T>,
  thenHandler: (value: T) => PromiseLike<void> | void,
  catchHandler: (error: unknown) => PromiseLike<void> | void,
): PromiseLike<void> | void {
  let value: T;
  try {
    const promiseOrValue = callback();
    if (
      typeof promiseOrValue === "object" &&
      promiseOrValue !== null &&
      "then" in promiseOrValue
    ) {
      return promiseOrValue.then(thenHandler, catchHandler);
    }
    value = promiseOrValue;
  } catch (e) {
    catchHandler(e);
    return;
  }

  thenHandler(value);
}
