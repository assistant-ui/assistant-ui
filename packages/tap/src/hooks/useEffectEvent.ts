import { useRef } from "./useRef";
import { useEffect } from "./useEffect";
import { isDevelopment } from "../core/helpers/env";
import { useCallback } from "./useCallback";
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
 * const handleClick = useEffectEvent((value: string) => {
 *   console.log(value);
 * });
 * // handleClick reference is stable, but always calls the latest version
 * ```
 */
export function useEffectEvent<T extends (...args: any[]) => any>(
  callback: T,
): T {
  const callbackRef = useRef(callback);

  // TODO this effect needs to run before all userland effects
  useEffect(() => {
    callbackRef.current = callback;
  });

  const fiber = getCurrentResourceFiber();
  return useCallback(
    ((...args: Parameters<T>) => {
      if (isDevelopment && fiber.renderContext)
        throw new Error("useEffectEvent cannot be called during render");
      return callbackRef.current(...args);
    }) as T,
    [fiber],
  );
}
