import { useRef } from "react";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import { isJSONValueEqual } from "../../utils/json/is-json-equal";

export function useJSONEqualValue<T extends ReadonlyJSONValue>(value: T): T {
  const prev = useRef(value);
  if (prev.current !== value && !isJSONValueEqual(prev.current, value)) {
    prev.current = value;
  }
  return prev.current;
}

/**
 * Like `useShallow`, but with JSON deep-equality. Use when a selector derives an
 * equal-but-fresh value on every store update — e.g. folding over
 * `thread.messages`, whose identity changes on every streaming token — where a
 * shallow compare would re-render regardless.
 */
export function useJSONEqual<S, U>(selector: (state: S) => U): (state: S) => U {
  const prev = useRef<U | undefined>(undefined);
  return (state) => {
    const next = selector(state);
    if (prev.current !== undefined && isJSONValueEqual(prev.current, next)) {
      return prev.current;
    }
    prev.current = next;
    return next;
  };
}
