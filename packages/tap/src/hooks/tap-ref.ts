import { tapState } from "./tap-state";

export interface RefObject<T> {
  current: T;
}

export function tapRef<T>(initialValue: T | (() => T)): RefObject<T>;
export function tapRef<T = undefined>(): RefObject<T | undefined>;
export function tapRef<T>(
  initialValue?: T | (() => T),
): RefObject<T | undefined> {
  const [state] = tapState(() => ({
    current:
      initialValue !== undefined && typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue,
  }));
  return state;
}
