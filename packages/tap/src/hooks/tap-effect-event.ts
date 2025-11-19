import { tapRef } from "./tap-ref";
import { tapEffect } from "./tap-effect";

/**
 * Creates a stable function reference that always calls the most recent version of the callback.
 * Similar to React's useEffectEvent hook.
 *
 * @param callback - The callback function to wrap
 * @returns A stable function reference that always calls the latest callback
 *
 * @example
 * ```typescript
 * const handleClick = tapEffectEvent((value: string) => {
 *   console.log(value);
 * });
 * // handleClick reference is stable, but always calls the latest version
 * ```
 */
export function tapEffectEvent<T extends (...args: any[]) => any>(
  callback: T,
): T {
  const callbackRef = tapRef(callback);

  tapEffect(() => {
    callbackRef.current = callback;
  });

  return callbackRef.current;
}
