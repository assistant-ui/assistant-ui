import { tapMemo } from "./tap-memo";

export const tapCallback = <T extends (...args: any[]) => any>(
  fn: T,
  deps: readonly unknown[],
): T => {
  // oxlint-disable-next-line tap-hooks/exhaustive-deps -- user-provided dep array forwarded verbatim
  return tapMemo(() => fn, deps);
};
