export function withPromiseOrValue<T>(
  callback: () => T | PromiseLike<T>,
  thenHandler: (value: T) => PromiseLike<void> | void,
  catchHandler: (error: unknown) => PromiseLike<void> | void,
): PromiseLike<void> | void {
  let promiseOrValue: T | PromiseLike<T>;
  try {
    promiseOrValue = callback();
  } catch (e) {
    catchHandler(e);
    return;
  }

  if (
    typeof promiseOrValue === "object" &&
    promiseOrValue !== null &&
    "then" in promiseOrValue
  ) {
    return promiseOrValue.then(thenHandler, catchHandler);
  }

  thenHandler(promiseOrValue);
}
