export function withPromiseOrValue<T>(
  callback: () => T | PromiseLike<T>,
  thenHandler: (value: T) => PromiseLike<void> | void,
  catchHandler: (error: unknown) => PromiseLike<void> | void
): PromiseLike<void> | void {
  try {
    const promiseOrValue = callback();
    if (
      typeof promiseOrValue === "object" &&
      promiseOrValue !== null &&
      "then" in (promiseOrValue as any)
    ) {
      return (promiseOrValue as PromiseLike<T>).then(thenHandler, catchHandler);
    } else {
      thenHandler(promiseOrValue as T);
    }
  } catch (e) {
    catchHandler(e);
  }
}
