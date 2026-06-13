import { useMemo } from "./useMemo";

export namespace useRef {
  export interface RefObject<T> {
    current: T;
  }
}

export function useRef<T>(initialValue: T): useRef.RefObject<T>;
export function useRef<T = undefined>(): useRef.RefObject<T | undefined>;
export function useRef<T>(initialValue?: T): useRef.RefObject<T | undefined> {
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => ({ current: initialValue }), []);
}
