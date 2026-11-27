import { describe, expect, it } from "vitest";
import { pairFlavorFiles } from "./pair-flavor-files";

const file = (path: string, content: string) => ({ path, content });

describe("pairFlavorFiles", () => {
  it("pairs files by path in order and keeps the Radix UI leftovers", () => {
    const base = [
      file("a.tsx", "a"),
      file("skeleton.tsx", "base skeleton"),
      file("b.tsx", "b"),
    ];
    const radix = [
      file("b.tsx", "radix b"),
      file("a.tsx", "a"),
      file("radix-only.tsx", "r"),
    ];
    const { pairs, radixOnly } = pairFlavorFiles(base, radix);

    expect(pairs).toEqual([
      [base[0], radix[1]],
      [base[1], undefined],
      [base[2], radix[0]],
    ]);
    expect(radixOnly).toEqual([radix[2]]);
  });

  it("pairs a path that two registry items share one-to-one", () => {
    const base = [file("shared.ts", "one"), file("shared.ts", "two")];
    const radix = [
      file("shared.ts", "one"),
      file("shared.ts", "two"),
      file("shared.ts", "three"),
    ];
    const { pairs, radixOnly } = pairFlavorFiles(base, radix);

    expect(pairs.map(([b, r]) => [b.content, r?.content])).toEqual([
      ["one", "one"],
      ["two", "two"],
    ]);
    expect(radixOnly).toEqual([radix[2]]);
  });
});
