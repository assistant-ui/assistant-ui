import { tapMemo } from "./tap-memo";

export const tapCallback = <T extends (...args: any[]) => any>(
  fn: T,
  deps: readonly unknown[],
): T => {
  return tapMemo(() => fn, deps);
};
