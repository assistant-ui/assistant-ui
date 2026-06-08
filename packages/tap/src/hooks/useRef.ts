import { useState } from "./useState";

export namespace useRef {
  export interface RefObject<T> {
    current: T;
  }
}

export function useRef<T>(initialValue: T): useRef.RefObject<T>;
export function useRef<T = undefined>(): useRef.RefObject<T | undefined>;
export function useRef<T>(initialValue?: T): useRef.RefObject<T | undefined> {
  const [state] = useState(() => ({
    current: initialValue,
  }));
  return state;
}
