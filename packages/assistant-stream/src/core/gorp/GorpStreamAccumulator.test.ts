import { describe, expect, it } from "vitest";
import { GorpStreamAccumulator } from "./GorpStreamAccumulator";

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
});
