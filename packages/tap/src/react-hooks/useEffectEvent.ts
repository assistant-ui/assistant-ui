import { useRef } from "./useRef";
import { isDevelopment } from "../core/helpers/env";
import { useCallback } from "./useCallback";
import { getCurrentResourceFiber } from "../core/helpers/execution-context";
import { CommitPriority } from "../core/helpers/commit";
import { addCommit } from "../core/helpers/root";

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
  const fiber = getCurrentResourceFiber();
  const callbackRef = useRef(callback);

  addCommit(fiber, CommitPriority.EffectEvent, () => {
    callbackRef.current = callback;
  });

  return useCallback(
    ((...args: Parameters<T>) => {
      if (isDevelopment && fiber.renderContext)
        throw new Error("useEffectEvent cannot be called during render");
      return callbackRef.current(...args);
    }) as T,
    [fiber],
  );
}
