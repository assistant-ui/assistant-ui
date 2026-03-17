import { tapMemo } from "./tap-memo";

export const tapCallback = <T extends (...args: any[]) => any>(
  fn: T,
  deps: readonly unknown[],
): T => {
  // biome-ignore lint/correctness/useExhaustiveDependencies: user provided deps instead of callback identity
  return tapMemo(() => fn, deps);
};
