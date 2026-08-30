import { describe, expect, it, vi } from "vitest";
import {
  createLinkedStateProto,
  runInStateSelector,
  withLinkedState,
} from "./linked-state";

type Linked = { items: readonly string[]; child: { n: number } };

const build = (resolvers: {
  items: () => readonly string[];
  child: () => { n: number };
}) =>
  withLinkedState<{ ids: readonly string[] }, Linked>(
    createLinkedStateProto<Linked>("thread", resolvers),
    { ids: ["a"] },
  );

describe("linked state", () => {
  it("throws when a linked field is read outside a state selector", () => {
    const state = build({ items: () => ["a"], child: () => ({ n: 1 }) });
    expect(() => state.items).toThrow(/thread\.items is linked child scope/);
    expect(() => state.child).toThrow(/thread\.child is linked child scope/);
  });

  it("resolves linked fields lazily inside a state selector", () => {
    const items = vi.fn(() => ["a"]);
    const state = build({ items, child: () => ({ n: 1 }) });
    expect(items).not.toHaveBeenCalled();
    expect(runInStateSelector(() => state.items)).toEqual(["a"]);
    expect(runInStateSelector(() => state.child)).toEqual({ n: 1 });
    expect(items).toHaveBeenCalledTimes(1);
  });

  it("keeps linked fields off the own keys", () => {
    const state = build({ items: () => [], child: () => ({ n: 0 }) });
    expect(Object.keys(state)).toEqual(["ids"]);
    expect(JSON.stringify(state)).toBe('{"ids":["a"]}');
    expect("items" in state).toBe(true);
  });

  it("returns the previous array while its elements are shallowly equal", () => {
    const a = { id: "a" };
    let next: object[] = [a];
    const state = withLinkedState<object, { items: object[] }>(
      createLinkedStateProto<{ items: object[] }>("thread", {
        items: () => next,
      }),
      {},
    );
    const first = runInStateSelector(() => state.items);
    next = [a];
    expect(runInStateSelector(() => state.items)).toBe(first);
    next = [a, { id: "b" }];
    expect(runInStateSelector(() => state.items)).not.toBe(first);
  });

  it("restores the guard after a selector throws", () => {
    const state = build({ items: () => [], child: () => ({ n: 0 }) });
    expect(() =>
      runInStateSelector(() => {
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(() => state.items).toThrow(/linked child scope/);
  });
});
