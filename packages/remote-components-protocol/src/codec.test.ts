import { describe, expect, it } from "vitest";
import { decode, deepEqual, diffProps, encode, getAtPath } from "./codec.js";
import { RemoteComponentError } from "./errors.js";

const roundTrip = (v: unknown) => {
  const enc = structuredClone(encode(v, { allowFunctions: true }));
  return decode(enc, (p) => Object.assign(() => p, { path: p }));
};

describe("encode/decode", () => {
  it("passes primitives and structured-clone types through", () => {
    const d = new Date(5);
    const m = new Map([["a", 1]]);
    const s = new Set([1, 2]);
    const v = {
      n: 1,
      b: true,
      u: undefined,
      nan: NaN,
      neg: -0,
      big: 10n,
      d,
      m,
      s,
      re: /a/g,
      buf: new Uint8Array([1, 2]),
    };
    const out = roundTrip(v) as typeof v;
    expect(out.d).toBeInstanceOf(Date);
    expect(out.d.getTime()).toBe(5);
    expect(out.m.get("a")).toBe(1);
    expect([...out.s]).toEqual([1, 2]);
    expect("u" in out).toBe(true);
    expect(out.nan).toBeNaN();
    expect(Object.is(out.neg, -0)).toBe(true);
    expect(out.big).toBe(10n);
    expect(out.re.flags).toBe("g");
    expect([...out.buf]).toEqual([1, 2]);
  });

  it("records function paths and restores proxies", () => {
    const enc = encode(
      { onClick: () => 1, items: [{ onSelect: () => 2 }, { label: "x" }] },
      { allowFunctions: true },
    );
    expect(enc.f).toEqual([["onClick"], ["items", 0, "onSelect"]]);
    expect((enc.v as { onClick: unknown }).onClick).toBeNull();
    const out = roundTrip({
      onClick: () => 1,
      items: [{ onSelect: () => 2 }],
    }) as {
      onClick: { path: unknown };
      items: [{ onSelect: { path: unknown } }];
    };
    expect(out.onClick.path).toEqual(["onClick"]);
    expect(out.items[0].onSelect.path).toEqual(["items", 0, "onSelect"]);
  });

  it("supports a function at the root", () => {
    const enc = encode(() => 1, { allowFunctions: true });
    expect(enc).toEqual({ v: null, f: [[]] });
    expect(typeof roundTrip(() => 1)).toBe("function");
  });

  it("omits f when there are no functions", () => {
    expect(encode({ a: 1 }, { allowFunctions: true })).toEqual({ v: { a: 1 } });
  });

  it("rejects functions when not allowed, naming the path", () => {
    expect(() =>
      encode(
        { a: [{ b: () => 1 }] },
        { allowFunctions: false, label: "arguments" },
      ),
    ).toThrowError(/arguments\.a\[0\]\.b/);
    try {
      encode({ a: () => 1 }, { allowFunctions: false });
    } catch (e) {
      expect(e).toBeInstanceOf(RemoteComponentError);
      expect((e as RemoteComponentError).code).toBe("data");
      expect((e as RemoteComponentError).data).toEqual({ path: ["a"] });
    }
  });

  it("rejects symbols, promises, weak collections", () => {
    expect(() =>
      encode({ s: Symbol("x") }, { allowFunctions: true }),
    ).toThrowError(/symbol at value\.s/);
    expect(() =>
      encode({ p: Promise.resolve(1) }, { allowFunctions: true }),
    ).toThrowError(/Promise at value\.p/);
    expect(() =>
      encode({ p: { then: () => 1 } }, { allowFunctions: true }),
    ).not.toThrow(); // plain object with a function "then" is just an object
    expect(() =>
      encode({ w: new WeakMap() }, { allowFunctions: true }),
    ).toThrowError(/WeakMap/);
  });

  it("rejects functions and symbols inside Map/Set", () => {
    expect(() =>
      encode({ m: new Map([["a", () => 1]]) }, { allowFunctions: true }),
    ).toThrowError(/inside a Map value/);
    expect(() =>
      encode({ m: new Map([[{ f: () => 1 }, 1]]) }, { allowFunctions: true }),
    ).toThrowError(/function/i);
    expect(() =>
      encode(new Set([Symbol()]), { allowFunctions: true }),
    ).toThrowError(/symbol inside a Set/);
  });

  it("ignores symbol-keyed props and copies class instances as plain objects", () => {
    class Point {
      x: number;
      y: number;
      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
      }
      get len() {
        return 0;
      }
    }
    const enc = encode(
      { p: new Point(1, 2), [Symbol("s")]: 1 },
      { allowFunctions: true },
    );
    const p = (enc.v as { p: object }).p;
    expect(Object.getPrototypeOf(p)).toBe(Object.prototype);
    expect(p).toEqual({ x: 1, y: 2 });
    expect(Object.getOwnPropertySymbols(enc.v as object)).toEqual([]);
  });

  it("preserves shared references and cycles", () => {
    const shared = { a: 1 };
    const cyc: Record<string, unknown> = { shared, again: shared };
    cyc.self = cyc;
    const out = structuredClone(encode(cyc, { allowFunctions: true }))
      .v as Record<string, unknown>;
    expect(out.self).toBe(out);
    expect(out.shared).toBe(out.again);
  });

  it("never invokes the __proto__ setter", () => {
    const evil = JSON.parse(
      '{"__proto__": {"polluted": true}, "f": 1}',
    ) as object;
    const enc = encode(evil, { allowFunctions: true });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(enc.v)).toBe(Object.prototype);
    // decoding a function at a __proto__ path defines an own property
    const obj = decode(
      { v: { x: {} }, f: [["x", "__proto__"]] },
      () => () => 1,
    ) as { x: object };
    expect(Object.getPrototypeOf(obj.x)).toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(obj.x, "__proto__")).toBe(true);
  });

  it("rejects malformed function paths on decode", () => {
    expect(() =>
      decode({ v: { a: 1 }, f: [["a", "b"]] }, () => () => 1),
    ).toThrowError(/Invalid function path/);
    expect(() => decode({ v: null, f: [["a"]] }, () => () => 1)).toThrowError(
      /Invalid function path/,
    );
  });

  it("getAtPath only follows own properties", () => {
    expect(getAtPath({ a: [{ b: 2 }] }, ["a", 0, "b"])).toBe(2);
    expect(getAtPath({ a: 1 }, ["toString"])).toBeUndefined();
    expect(getAtPath({ a: 1 }, ["a", "b"])).toBeUndefined();
  });
});

describe("deepEqual", () => {
  it("compares structurally", () => {
    expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(deepEqual(new Date(1), new Date(1))).toBe(true);
    expect(deepEqual(new Date(1), new Date(2))).toBe(false);
    expect(deepEqual(new Map([[1, { a: 1 }]]), new Map([[1, { a: 1 }]]))).toBe(
      true,
    );
    expect(deepEqual(new Set([1]), new Set([2]))).toBe(false);
    expect(deepEqual(new Uint8Array([1]), new Uint8Array([1]))).toBe(true);
    expect(deepEqual(new Uint8Array([1]), new Int8Array([1]))).toBe(false);
    expect(deepEqual(/a/g, /a/g)).toBe(true);
    expect(deepEqual(NaN, NaN)).toBe(true);
    expect(deepEqual([1], { 0: 1, length: 1 })).toBe(false);
  });

  it("handles cycles", () => {
    const a: Record<string, unknown> = { x: 1 };
    a.self = a;
    const b: Record<string, unknown> = { x: 1 };
    b.self = b;
    expect(deepEqual(a, b)).toBe(true);
  });
});

describe("diffProps", () => {
  it("sends everything first, then only changed keys", () => {
    const first = diffProps(null, { a: 1, b: { c: 2 }, onX: () => 1 });
    expect(Object.keys(first.patch!.set)).toEqual(["a", "b", "onX"]);
    const second = diffProps(first.encoded, {
      a: 1,
      b: { c: 2 },
      onX: () => 2,
    });
    expect(second.patch).toBeNull(); // new function identity at the same path is not a change
    const third = diffProps(second.encoded, { a: 2, b: { c: 2 } });
    expect(third.patch).toEqual({ set: { a: { v: 2 } }, del: ["onX"] });
  });

  it("skips keys that cannot be encoded and reports them", () => {
    const errors: string[] = [];
    const first = diffProps(null, { a: 1, bad: Symbol("x") }, (k) =>
      errors.push(k),
    );
    expect(errors).toEqual(["bad"]);
    expect(Object.keys(first.patch!.set)).toEqual(["a"]);
    const second = diffProps(
      { ...first.encoded, bad: { v: 1 } },
      { a: 1, bad: Symbol("x") },
      () => {},
    );
    expect(second.patch).toEqual({ set: {}, del: ["bad"] });
    expect(() => diffProps(null, { bad: Symbol("x") })).toThrow();
  });

  it("handles a __proto__ prop key safely", () => {
    const next = JSON.parse('{"__proto__": 1}') as Record<string, unknown>;
    const { encoded, patch } = diffProps(null, next);
    expect(Object.prototype.hasOwnProperty.call(encoded, "__proto__")).toBe(
      true,
    );
    expect(Object.prototype.hasOwnProperty.call(patch!.set, "__proto__")).toBe(
      true,
    );
  });

  it("treats a value turning into a function as a change", () => {
    const first = diffProps(null, { a: null });
    const second = diffProps(first.encoded, { a: () => 1 });
    expect(second.patch?.set.a).toEqual({ v: null, f: [[]] });
  });
});

describe("prototype safety", () => {
  it("function paths cannot reach a prototype", async () => {
    const { decode } = await import("./codec.js");
    const { validateFromRemote } = await import("./validate.js");
    const evil = { v: {}, f: [["__proto__", "polluted"]] };
    expect(() => decode(evil, () => () => 1)).toThrow(/Invalid function path/);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    const msg = {
      type: "req",
      id: 1,
      method: "overlay.update",
      params: { id: "o1", props: evil },
    };
    expect(validateFromRemote(msg)).toBe(false);
  });
});
