import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSpecPosition } from "../spec/position";

const inTreeOrder = (a: readonly number[], b: readonly number[]) => {
  for (let index = 0; index < a.length && index < b.length; index++) {
    if (a[index] !== b[index]) return a[index]! - b[index]!;
  }
  return a.length - b.length;
};

/** Stores a row's text fragments in tree order: by spec position, then in the order they first rendered. */
export function createRowLabelStore() {
  const labels = new Map<number, { order: number[]; text: string }>();
  const listeners = new Set<() => void>();
  let slots = 0;
  let name: string | undefined;
  return {
    reserve: () => slots++,
    set(slot: number, text: string | undefined, position?: string) {
      if (text?.trim()) {
        const order = position?.split(".").map(Number) ?? [];
        // -1 puts an element's own text before its children, whose positions start at 0.
        labels.set(slot, { order: [...order, -1, slot], text });
      } else labels.delete(slot);
      const next =
        [...labels.values()]
          .sort((a, b) => inTreeOrder(a.order, b.order))
          .map((label) => label.text)
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

/** Shares a bound row's label store with its text descendants. */
export const RowLabelProvider = RowLabelContext.Provider;

/** Registers text with the enclosing row and reports whether it was consumed. */
export function useListViewItemText(text: string | undefined): boolean {
  const store = useContext(RowLabelContext);
  const position = useSpecPosition();
  const [slot] = useState(() => store?.reserve() ?? 0);
  useEffect(() => {
    store?.set(slot, text, position);
  }, [store, slot, text, position]);
  useEffect(() => () => store?.set(slot, undefined), [store, slot]);
  return store !== null && !!text?.trim();
}

/** Keeps a nested control's children out of the enclosing row label. */
export function ListViewItemTextBoundary({
  children,
}: {
  children?: ReactNode;
}) {
  return (
    <RowLabelContext.Provider value={null}>{children}</RowLabelContext.Provider>
  );
}
