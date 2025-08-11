import { tapState } from "./tap-state";

interface MutableRefObject<T> {
  current: T;
}

export function tapRef<T>(initialValue: T | (() => T)): MutableRefObject<T>;
export function tapRef<T = undefined>(): MutableRefObject<T | undefined>;
export function tapRef<T>(
  initialValue?: T | (() => T)
): MutableRefObject<T | undefined> {
  const [state] = tapState(() => ({
    current:
      initialValue !== undefined && typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue,
  }));
  return state;
}
