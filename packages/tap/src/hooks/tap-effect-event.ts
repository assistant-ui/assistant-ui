import { tapRef } from "./tap-ref";
import { tapEffect } from "./tap-effect";
import { isDevelopment } from "../core/helpers/env";
import { tapCallback } from "./tap-callback";
import { getCurrentResourceFiber } from "../core/helpers/execution-context";

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

  // TODO this effect needs to run before all userland effects
  tapEffect(() => {
    callbackRef.current = callback;
  });

  if (isDevelopment) {
    const fiber = getCurrentResourceFiber();
    return tapCallback(
      ((...args: Parameters<T>) => {
        if (fiber.renderContext)
          throw new Error("tapEffectEvent cannot be called during render");
        return callbackRef.current(...args);
      }) as T,
      [fiber],
    );
  }

  return callbackRef.current;
}
