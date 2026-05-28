import { describe, expect, it } from "vitest";
import { Gorp, appendText, type GorpOperation } from "../src/Gorp";

type State = {
  scalar: number;
  nested: { deep: { leaf: string } };
  items: Record<string, { name: string }>;
  list: string[];
  text: string;
};

const initial = (): State => ({
  scalar: 0,
  nested: { deep: { leaf: "x" } },
  items: { a: { name: "alpha" }, b: { name: "beta" } },
  list: ["one", "two", "three"],
  text: "hello",
});

/** Test helper: collects ops emitted while `fn` runs against a draft. */
function collect<S extends Record<string, unknown>>(
  g: Gorp<S>,
  fn: (state: S) => void,
): GorpOperation[] {
  const ops: GorpOperation[] = [];
  fn(g.draft((op) => ops.push(op)));
  return ops;
}

describe("Gorp.draft proxy", () => {
  it("emits a single set op for a deep write", () => {
    const g = new Gorp<State>(initial());
    const ops = collect(g, (s) => {
      s.nested.deep.leaf = "y";
    });
    expect(ops).toEqual([
      { type: "set", path: ["nested", "deep", "leaf"], value: "y" },
    ]);
  });

  it("emits an append-text op when the value is the appendText marker", () => {
    const g = new Gorp<State>(initial());
    const ops = collect(g, (s) => {
      s.text = appendText(" world");
    });
    expect(ops).toEqual([
      { type: "append-text", path: ["text"], value: " world" },
    ]);
    expect(g.state.text).toBe("hello world");
  });

  it("uses numeric segments as path keys when writing into an array", () => {
    const g = new Gorp<State>(initial());
    const ops = collect(g, (s) => {
      s.list[1] = "TWO";
    });
    expect(ops).toEqual([{ type: "set", path: ["list", "1"], value: "TWO" }]);
    expect(g.state.list).toEqual(["one", "TWO", "three"]);
  });

  it("exposes live array length via the proxy (push pattern)", () => {
    const g = new Gorp<State>(initial());
    collect(g, (s) => {
      s.list[s.list.length] = "four";
    });
    expect(g.state.list).toEqual(["one", "two", "three", "four"]);
  });

  it("returns live keys from Object.keys on a sub-proxy", () => {
    const g = new Gorp<State>(initial());
    let observed: string[] = [];
    collect(g, (s) => {
      observed = Object.keys(s.items);
    });
    expect(observed).toEqual(["a", "b"]);
  });

  it("reflects live presence via the `in` operator", () => {
    const g = new Gorp<State>(initial());
    let hasA = false;
    let hasZ = false;
    collect(g, (s) => {
      hasA = "a" in s.items;
      hasZ = "z" in s.items;
    });
    expect(hasA).toBe(true);
    expect(hasZ).toBe(false);
  });

  it("throws when a mutating array method is called (length set blocked)", () => {
    const g = new Gorp<State>(initial());
    expect(() =>
      collect(g, (s) => {
        (s.list as unknown as { push: (x: string) => void }).push("four");
      }),
    ).toThrow(/Mutating array methods/);
  });

  it("throws when a non-numeric property is set on an array proxy", () => {
    const g = new Gorp<State>(initial());
    expect(() =>
      collect(g, (s) => {
        (s.list as unknown as Record<string, unknown>).foo = "bar";
      }),
    ).toThrow(/Mutating array methods/);
  });

  it("forwards prototype reads on arrays so read-only methods work", () => {
    const g = new Gorp<State>(initial());
    let found: string | undefined;
    let mapped: string[] = [];
    collect(g, (s) => {
      found = s.list.find((x) => x === "two");
      mapped = s.list.map((x) => x.toUpperCase());
    });
    expect(found).toBe("two");
    expect(mapped).toEqual(["ONE", "TWO", "THREE"]);
  });

  it("throws in dev mode when a proxy value is stored back into state", () => {
    const g = new Gorp<{ items: { a: { name: string }; b: { name: string } } }>(
      { items: { a: { name: "alpha" }, b: { name: "beta" } } },
    );
    expect(() =>
      collect(g, (s) => {
        // Storing a sub-proxy directly would cause infinite recursion on
        // subsequent reads — the dev guard catches it.
        s.items.a = s.items.b;
      }),
    ).toThrow(/Refusing to store a Gorp proxy/);
  });

  it("accepts plain values produced from proxies via spread", () => {
    const g = new Gorp<{ items: { a: { name: string }; b: { name: string } } }>(
      { items: { a: { name: "alpha" }, b: { name: "beta" } } },
    );
    collect(g, (s) => {
      // Spreading converts to plain — safe to store.
      s.items.a = { ...s.items.b };
    });
    expect(g.state.items.a).toEqual({ name: "beta" });
  });

  it("composes sub-proxies to walk to a primitive leaf", () => {
    const g = new Gorp<State>(initial());
    let leaf: string | undefined;
    collect(g, (s) => {
      leaf = s.nested.deep.leaf;
    });
    expect(leaf).toBe("x");
  });

  it("returns undefined for symbol-keyed reads", () => {
    const g = new Gorp<State>(initial());
    let value: unknown = "sentinel";
    collect(g, (s) => {
      value = (s as unknown as { [Symbol.iterator]: unknown })[Symbol.iterator];
    });
    expect(value).toBeUndefined();
  });
});
