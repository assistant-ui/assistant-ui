import { useMemo, useRef } from "react";

export const shallowEqual = (a: object, b: object): boolean => {
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

// `useAuiState` compares snapshots with `Object.is`, so a selector that derives
// a fresh object or array notifies on every publish. This caches the last
// result and hands the previous reference back while it stays shallow-equal.
export const useShallowSelector = <TState, TResult extends object>(
  select: (state: TState) => TResult,
): ((state: TState) => TResult) => {
  const previous = useRef<TResult | undefined>(undefined);
  return (state) => {
    const next = select(state);
    if (
      previous.current !== undefined &&
      shallowEqual(previous.current, next)
    ) {
      return previous.current;
    }
    previous.current = next;
    return next;
  };
};
