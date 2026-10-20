export function createSettleOutsideAct(
  act: (callback: () => Promise<void>) => unknown,
  waitFor: (callback: () => Promise<void>) => unknown,
): <T>(task: () => Promise<T>) => Promise<T>;
