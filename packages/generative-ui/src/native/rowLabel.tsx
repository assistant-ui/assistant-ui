import { createContext, useContext, useEffect, type ReactNode } from "react";
import { usePosition } from "../spec/position";

const comparePositions = (left: string, right: string) => {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  const length = Math.min(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index++) {
    const difference = leftParts[index]! - rightParts[index]!;
    if (difference !== 0) return difference;
  }
  return leftParts.length - rightParts.length;
};

export function createRowLabelStore() {
  const labels = new Map<string, string>();
  const listeners = new Set<() => void>();
  let name: string | undefined;
  return {
    set(slot: string, text: string | undefined) {
      if (text?.trim()) labels.set(slot, text);
      else labels.delete(slot);
      const next =
        [...labels]
          .sort(([a], [b]) => comparePositions(a, b))
          .map(([, label]) => label)
          .join(", ") || undefined;
      if (next === name) return;
      name = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => name,
  };
}

const RowLabelContext = createContext<ReturnType<
  typeof createRowLabelStore
> | null>(null);
export const RowLabelProvider = RowLabelContext.Provider;

export function useListViewItemText(
  text: string | undefined,
  part = 0,
): boolean {
  const store = useContext(RowLabelContext);
  const position = usePosition();
  const slot = [...position, -1, part].join(".");
  useEffect(() => {
    store?.set(slot, text);
  }, [store, slot, text]);
  useEffect(() => () => store?.set(slot, undefined), [store, slot]);
  return store !== null && !!text?.trim();
}

export function ListViewItemTextBoundary({
  children,
}: {
  children?: ReactNode;
}) {
  return (
    <RowLabelContext.Provider value={null}>{children}</RowLabelContext.Provider>
  );
}
