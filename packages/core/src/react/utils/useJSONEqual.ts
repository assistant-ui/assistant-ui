import { useRef } from "react";
import { isJSONValueEqual } from "../../utils/json/is-json-equal";

/**
 * Returns the previous value while the new one is JSON-equal to it. Use when a
 * value is derived fresh on every render from state whose identity changes on
 * every streaming token, e.g. folding over `thread.messages`.
 */
export function useJSONStable<U>(next: U): U {
  const prev = useRef<U | undefined>(undefined);
  if (prev.current !== undefined && isJSONValueEqual(prev.current, next)) {
    return prev.current;
  }
  prev.current = next;
  return next;
}
