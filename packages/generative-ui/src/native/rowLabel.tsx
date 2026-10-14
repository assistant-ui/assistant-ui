import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSpecPosition } from "../spec/position";

// One step per level on a text's path, each keyed by the branch it sits in; the last step is its element's own text.
const stepsOf = (position: string) => {
  const steps: { branch: string; indices: number[] }[] = [];
  let parent = "";
  for (const step of position.split("/").slice(1)) {
    const [branch, ...indices] = step.split(".");
    steps.push({ branch: `${parent}/${branch}`, indices: indices.map(Number) });
    parent += `/${step}`;
  }
  steps.push({ branch: `${parent}/`, indices: [] });
  return steps;
};

const inTreeOrder = (a: readonly number[], b: readonly number[]) => {
  for (let index = 0; index < a.length && index < b.length; index++) {
    if (a[index] !== b[index]) return a[index]! - b[index]!;
  }
  return a.length - b.length;
};

/**
 * Stores a row's text fragments in tree order. Elements in one branch follow
 * their place in it, and an element's own text, its children, and each named
 * slot are branches ordered by the first text each rendered, since a component
 * lays them out in any order.
 */
export function createRowLabelStore() {
  const labels = new Map<number, { position: string; text: string }>();
  const firstRendered = new Map<string, number>();
  const orderOf = (slot: number, position: string) => [
    ...stepsOf(position).flatMap(({ branch, indices }) => [
      firstRendered.get(branch) ?? slot,
      ...indices,
    ]),
    slot,
  ];
  const listeners = new Set<() => void>();
  let slots = 0;
  let name: string | undefined;
  return {
    reserve: () => slots++,
    set(slot: number, text: string | undefined, position?: string) {
      if (position !== undefined) {
        for (const { branch } of stepsOf(position))
          firstRendered.set(
            branch,
            Math.min(firstRendered.get(branch) ?? slot, slot),
          );
      }
      if (text?.trim()) labels.set(slot, { position: position ?? "", text });
      else labels.delete(slot);
      const next =
        [...labels]
          .map(([at, label]) => ({
            order: orderOf(at, label.position),
            text: label.text,
          }))
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
