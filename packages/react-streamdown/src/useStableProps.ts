"use client";

import { useRef } from "react";
import { isEqualToDepth } from "./memoization";

/**
 * Keeps the identity of props whose contents are unchanged, comparing one array
 * or object level so that an inline `remarkPlugins={[plugin]}` still reaches the
 * memoized body. A value mutated in place keeps the old identity and is not
 * observed.
 */
export function useStableProps<T>(props: T): T {
  const previous = useRef(props);
  if (!isEqualToDepth(props, previous.current, 2)) previous.current = props;
  return previous.current;
}
