import { useRef } from "react";
import { isJSONValueEqual } from "../../utils/json/is-json-equal";

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
