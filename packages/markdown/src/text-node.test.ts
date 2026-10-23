import { describe, expect, it } from "vitest";
import { concatText, createText, sliceText, syntaxOf } from "./text-node";

describe("text nodes", () => {
  it("keeps the public node free of syntax", () => {
    const node = createText("a*b", "a\0b");
    expect(node).toEqual({ type: "text", value: "a*b" });
    expect(syntaxOf(node)).toBe("a\0b");
    expect(syntaxOf(createText("plain"))).toBe("plain");
  });

  it("keeps the mask aligned when slicing and joining", () => {
    const node = createText("a*b*c", "a\0b*c");
    const head = sliceText(node, 0, 3);
    const tail = sliceText(node, 3);
    expect([head.value, syntaxOf(head)]).toEqual(["a*b", "a\0b"]);
    expect([tail.value, syntaxOf(tail)]).toEqual(["*c", "*c"]);

    const joined = concatText(head, tail);
    expect([joined.value, syntaxOf(joined)]).toEqual(["a*b*c", "a\0b*c"]);
  });
});
