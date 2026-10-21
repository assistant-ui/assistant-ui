import { describe, expect, it } from "vitest";
import { resolvePath, resolvePointer } from "./dataModel";

describe("resolvePath", () => {
  it("distinguishes an empty property name from the root", () => {
    const source = { "": { value: "empty key" }, value: "root" };
    expect(resolvePath(source, [])).toBe(source);
    expect(resolvePath(source, ["", "value"])).toBe("empty key");
  });

  it("reads array entries without exposing inherited properties", () => {
    const source = { items: [{ value: "first" }] };
    expect(resolvePath(source, ["items", "0", "value"])).toBe("first");
    expect(resolvePath(source, ["items", "01"])).toBeUndefined();
    expect(resolvePath(source, ["toString"])).toBeUndefined();
  });
});

describe("resolvePointer", () => {
  it("keeps the scope-relative root and escaped-key behavior", () => {
    const source = { "a/b~c": "value" };
    expect(resolvePointer(source, "")).toBe(source);
    expect(resolvePointer(source, "/")).toBe(source);
    expect(resolvePointer(source, "/a~1b~0c")).toBe("value");
  });
});
