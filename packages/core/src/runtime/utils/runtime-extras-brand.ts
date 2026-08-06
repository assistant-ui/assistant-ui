/** @deprecated Internal API for external-store adapter authors. Not part of the public API; may change or be removed without notice. */
export type RuntimeExtrasBrand<T extends object> = {
  provide: (value: T) => T;
  is: (extras: unknown) => extras is T;
  tryGet: (extras: unknown) => T | undefined;
  assert: (extras: unknown) => T;
};

/**
 * Creates the framework-neutral half of a runtime extras channel: the brand
 * symbol with its provide/read primitives. A runtime factory provides extras
 * through the brand on any framework; the React entry wraps the same brand
 * with a `use()` hook. The symbol is per-instance, so the adapter package
 * creates the brand once and every binding imports that instance.
 *
 * @deprecated Internal API for external-store adapter authors. Not part of the public API; may change or be removed without notice.
 */
export const createRuntimeExtrasBrand = <T extends object>(
  runtimeName: string,
): RuntimeExtrasBrand<T> => {
  const brand = Symbol(`${runtimeName} extras`);

  const is = (extras: unknown): extras is T =>
    typeof extras === "object" && extras !== null && brand in extras;

  const assert = (extras: unknown): T => {
    if (!is(extras))
      throw new Error(
        `The current thread is not backed by the ${runtimeName} runtime.`,
      );
    return extras;
  };

  const provide = (value: T): T => {
    Object.defineProperty(value, brand, {
      value: true,
      enumerable: false,
      configurable: true,
    });
    return value;
  };

  const tryGet = (extras: unknown): T | undefined =>
    is(extras) ? extras : undefined;

  return { provide, is, tryGet, assert };
};
