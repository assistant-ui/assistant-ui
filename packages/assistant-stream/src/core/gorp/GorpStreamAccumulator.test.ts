import { afterEach, describe, expect, it, vi } from "vitest";
import { GorpStreamAccumulator } from "./GorpStreamAccumulator";
import type { GorpStreamOperation } from "./types";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GorpStreamAccumulator", () => {
  it("rejects unsafe path segments", () => {
    for (const path of [
      ["__proto__", "polluted"],
      ["constructor", "prototype", "polluted"],
      ["a", "__proto__"],
    ]) {
      const acc = new GorpStreamAccumulator({});
      expect(() => acc.append([{ type: "set", path, value: true }])).toThrow(
        /Unsafe gorp path segment/,
      );
    }
    expect(({} as { polluted?: unknown }).polluted).toBeUndefined();
  });

  it("treats inherited keys as absent when navigating", () => {
    const acc = new GorpStreamAccumulator({});
    acc.append([{ type: "set", path: ["toString", "x"], value: 1 }]);
    expect(acc.state).toEqual({ toString: { x: 1 } });

    const append = new GorpStreamAccumulator({ toString: "hi" });
    append.append([{ type: "append-text", path: ["toString"], value: "!" }]);
    expect(append.state).toEqual({ toString: "hi!" });
  });

  describe("strict: false", () => {
    it("skips unappliable operations and keeps applying the rest", () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      const acc = new GorpStreamAccumulator({ a: 1 }, { strict: false });
      acc.append([
        { type: "append-text", path: ["a"], value: "x" },
        { type: "unknown-op" } as unknown as GorpStreamOperation,
        { type: "set", path: ["a", "b"], value: 1 },
        { type: "set", path: ["ok"], value: true },
      ]);
      expect(acc.state).toEqual({ a: 1, ok: true });
      expect(error).toHaveBeenCalledTimes(3);
      error.mockRestore();
    });

    it("clamps out-of-bounds array inserts", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const acc = new GorpStreamAccumulator({ list: ["a"] }, { strict: false });
      acc.append([{ type: "set", path: ["list", "5"], value: "b" }]);
      expect(acc.state).toEqual({ list: ["a", "b"] });
      expect(warn).toHaveBeenCalledOnce();
      warn.mockRestore();
    });

    it("skips non-numeric array indices", () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      const acc = new GorpStreamAccumulator({ list: ["a"] }, { strict: false });
      acc.append([{ type: "set", path: ["list", "x"], value: "b" }]);
      expect(acc.state).toEqual({ list: ["a"] });
      expect(error).toHaveBeenCalledOnce();
      error.mockRestore();
    });

    it("skips negative array indices", () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      const acc = new GorpStreamAccumulator({ list: ["a"] }, { strict: false });
      acc.append([{ type: "set", path: ["list", "-1"], value: "b" }]);
      expect(acc.state).toEqual({ list: ["a"] });
      expect(error).toHaveBeenCalledOnce();
    });
  });

  it("throws on out-of-bounds array inserts by default", () => {
    const acc = new GorpStreamAccumulator({ list: ["a"] });
    expect(() =>
      acc.append([{ type: "set", path: ["list", "5"], value: "b" }]),
    ).toThrow(/out of bounds/);
  });
});
