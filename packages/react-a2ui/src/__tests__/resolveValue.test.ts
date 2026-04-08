import { describe, it, expect, vi } from "vitest";
import { resolveValue } from "../registry/resolveValue";

describe("resolveValue", () => {
  it("should return plain values unchanged", () => {
    const getData = vi.fn();
    expect(resolveValue("hello", getData)).toBe("hello");
    expect(resolveValue(42, getData)).toBe(42);
    expect(resolveValue(null, getData)).toBeNull();
    expect(getData).not.toHaveBeenCalled();
  });

  it("should resolve path-bound values", () => {
    const getData = vi.fn().mockReturnValue("Tokyo");
    const result = resolveValue({ path: "/booking/destination" }, getData);
    expect(result).toBe("Tokyo");
    expect(getData).toHaveBeenCalledWith("/booking/destination");
  });

  it("should return objects without path key unchanged", () => {
    const getData = vi.fn();
    const obj = { foo: "bar" };
    expect(resolveValue(obj, getData)).toBe(obj);
    expect(getData).not.toHaveBeenCalled();
  });
});
