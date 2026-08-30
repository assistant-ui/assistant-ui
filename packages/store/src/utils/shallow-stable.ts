import { useRef } from "react";

export const shallowEqualArray = (
  a: readonly unknown[],
  b: readonly unknown[],
) =>
  a === b || (a.length === b.length && a.every((v, i) => Object.is(v, b[i])));

export const shallowEqualObject = (a: object, b: object) => {
  if (a === b) return true;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  return (
    aKeys.length === bKeys.length &&
    aKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(b, key) &&
        Object.is(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
        ),
    )
  );
};

export const useShallowStable = <T>(
  next: T,
  equals: (a: T, b: T) => boolean,
): T => {
  const ref = useRef(next);
  if (!equals(ref.current, next)) ref.current = next;
  return ref.current;
};
