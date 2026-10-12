import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";

export function createRowLabelStore() {
  const labels = new Map<number, string>();
  const listeners = new Set<() => void>();
  let slots = 0;
  let name: string | undefined;
  return {
    reserve: () => slots++,
    set(slot: number, text: string | undefined) {
      if (text?.trim()) labels.set(slot, text);
      else labels.delete(slot);
      const next =
        [...labels]
          .sort(([a], [b]) => a - b)
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

export function useListViewItemText(text: string | undefined): boolean {
  const store = useContext(RowLabelContext);
  const [slot] = useState(() => store?.reserve() ?? 0);
  useLayoutEffect(() => {
    store?.set(slot, text);
  }, [store, slot, text]);
  useLayoutEffect(() => () => store?.set(slot, undefined), [store, slot]);
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
