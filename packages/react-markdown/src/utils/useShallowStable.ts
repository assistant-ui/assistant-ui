import { useRef } from "react";

const shallowEqual = (a: object, b: object): boolean => {
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return (
      a.length === b.length && a.every((value, i) => Object.is(value, b[i]))
    );
  }

  const aKeys = Object.keys(a);
  return (
    aKeys.length === Object.keys(b).length &&
    aKeys.every(
      (key) =>
        Object.hasOwn(b, key) &&
        Object.is(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
        ),
    )
  );
};

export const useShallowStable = <T extends object | null | undefined>(
  value: T,
): T => {
  const cell = useRef({ value });
  if (
    cell.current.value !== value &&
    cell.current.value !== null &&
    cell.current.value !== undefined &&
    value !== null &&
    value !== undefined &&
    shallowEqual(cell.current.value, value)
  ) {
    return cell.current.value;
  }
  cell.current.value = value;
  return value;
};
