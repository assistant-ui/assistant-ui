import { useMemo } from "./useMemo";

export const useCallback = <T extends (...args: any[]) => any>(
  fn: T,
  deps: readonly unknown[],
): T => {
  // oxlint-disable-next-line tap-hooks/exhaustive-deps -- user-provided dep array forwarded verbatim
  return useMemo(() => fn, deps);
};
