import { useMemo } from "react";

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

export const useShallowStable = <T extends object>(value: T): T => {
  const cell = useMemo(() => ({}) as { v?: T }, []);
  if (cell.v !== undefined && shallowEqual(cell.v, value)) return cell.v;
  cell.v = value;
  return value;
};
