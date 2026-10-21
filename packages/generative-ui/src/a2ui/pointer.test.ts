import { describe, expect, it } from "vitest";
import { decodeAbsolutePointer, decodeScopeRelativePointer } from "./pointer";

describe("A2UI JSON pointer decoders", () => {
  it.each([decodeAbsolutePointer, decodeScopeRelativePointer])(
    "decodes roots, escapes, and array index segments",
    (decode) => {
      expect(decode("")).toEqual([]);
      expect(decode("/")).toEqual([]);
      expect(decode("/~0/~1/~01/0/12")).toEqual(["~", "/", "~1", "0", "12"]);
    },
  );

  it("rejects relative paths for the absolute decoder", () => {
    expect(decodeAbsolutePointer("items/0/~01")).toBeUndefined();
  });

  it("accepts relative paths for the scope-relative decoder", () => {
    expect(decodeScopeRelativePointer("items/0/~01")).toEqual([
      "items",
      "0",
      "~1",
    ]);
  });
});
