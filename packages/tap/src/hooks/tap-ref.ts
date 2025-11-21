import { tapState } from "./tap-state";

export namespace tapRef {
  export interface RefObject<T> {
    current: T;
  }
}

export function tapRef<T>(initialValue: T): tapRef.RefObject<T>;
export function tapRef<T = undefined>(): tapRef.RefObject<T | undefined>;
export function tapRef<T>(initialValue?: T): tapRef.RefObject<T | undefined> {
  const [state] = tapState(() => ({
    current: initialValue,
  }));
  return state;
}
