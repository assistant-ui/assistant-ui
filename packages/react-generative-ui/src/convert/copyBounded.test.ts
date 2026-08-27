import { describe, expect, it } from "vitest";
import { copyBounded } from "./copyBounded";

const hostileSpecies = (real: unknown[], injected: unknown[]) => {
  function HostileCtor() {
    return { map: () => injected, some: () => true, length: 0 };
  }
  const constructor = { [Symbol.species]: HostileCtor };
  return new Proxy(real, {
    get: (target, prop, receiver) =>
      prop === "constructor"
        ? constructor
        : Reflect.get(target, prop, receiver),
  });
};

describe("copyBounded", () => {
  it("copies every entry of a shorter array", () => {
    expect(copyBounded(["a", "b"], 5)).toEqual(["a", "b"]);
  });

  it("stops at the cap", () => {
    expect(copyBounded(["a", "b", "c"], 2)).toEqual(["a", "b"]);
  });

  it("returns a fresh array rather than the input", () => {
    const input = ["a"];
    expect(copyBounded(input, 5)).not.toBe(input);
  });

  it("leaves an absent index absent, as slice does", () => {
    const sparse: unknown[] = [];
    sparse[0] = "a";
    sparse[2] = "c";

    const result = copyBounded(sparse, 5);

    expect(result).toHaveLength(3);
    expect(1 in result).toBe(false);
    expect(result).toEqual(sparse.slice(0, 5));
  });

  it("does not read an index the input reports as absent", () => {
    const reads: string[] = [];
    const probe = new Proxy(["a", "b"], {
      has: (target, prop) => prop !== "1" && Reflect.has(target, prop),
      get: (target, prop, receiver) => {
        if (typeof prop === "string" && /^\d+$/.test(prop)) reads.push(prop);
        return Reflect.get(target, prop, receiver);
      },
    });

    const result = copyBounded(probe, 2);

    expect(reads).toEqual(["0"]);
    expect(1 in result).toBe(false);
  });

  it("bounds an array whose reported length is fabricated", () => {
    const hostile = new Proxy(["a", "b"], {
      get: (target, prop, receiver) =>
        prop === "length"
          ? Number.MAX_SAFE_INTEGER
          : Reflect.get(target, prop, receiver),
    });

    expect(copyBounded(hostile, 3)).toEqual(["a", "b", undefined]);
  });

  it("bounds an array that replaces its slice", () => {
    const hostile = new Proxy(["a", "b"], {
      get: (target, prop, receiver) =>
        prop === "slice"
          ? () => Array(500).fill("injected")
          : Reflect.get(target, prop, receiver),
    });

    expect(copyBounded(hostile, 5)).toEqual(["a", "b"]);
  });

  it("bounds an array that redirects Symbol.species to a foreign object", () => {
    const injected = Array(500).fill("injected");
    const result = copyBounded(hostileSpecies(["a", "b"], injected), 5);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(["a", "b"]);
  });
});
