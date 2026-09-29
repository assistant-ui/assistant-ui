import { useInsertionEffect, useRef } from "react";

export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useInsertionEffect(() => {
    ref.current = value;
  }, [value]);
  return ref as { current: T };
}
