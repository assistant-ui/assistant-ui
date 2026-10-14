import { describe, expect, it } from "vitest";
import { firstMissingId } from "./tree";
import type { Spec } from "./types";

const spec = (elements: Spec["elements"], root = "main"): Spec => ({
  root,
  elements,
});

describe("firstMissingId", () => {
  it("returns the root while the root element has not arrived", () => {
    expect(firstMissingId(spec({}))).toBe("main");
    expect(firstMissingId(spec({ main: {} as Spec["elements"][string] }))).toBe(
      "main",
    );
  });

  it("returns undefined for an empty root or a complete tree", () => {
    expect(firstMissingId(spec({}, ""))).toBeUndefined();
    expect(
      firstMissingId(
        spec({
          main: { type: "Stack", children: ["a"] },
          a: { type: "Text" },
        }),
      ),
    ).toBeUndefined();
  });

  it("walks children depth first before later siblings", () => {
    expect(
      firstMissingId(
        spec({
          main: { type: "Stack", children: ["a", "b"] },
          a: { type: "Stack", children: ["a1"] },
        }),
      ),
    ).toBe("a1");
  });

  it("walks named slots after the default slot", () => {
    expect(
      firstMissingId(
        spec({
          main: {
            type: "Stack",
            children: ["a"],
            slots: { footer: ["f"] },
          },
          a: { type: "Text" },
        }),
      ),
    ).toBe("f");
    expect(
      firstMissingId(
        spec({
          main: {
            type: "Stack",
            children: ["a"],
            slots: { footer: ["f"] },
          },
        }),
      ),
    ).toBe("a");
  });

  it("ignores ids that are not strings and stops at cycles", () => {
    expect(
      firstMissingId(
        spec({
          main: {
            type: "Stack",
            children: [42 as unknown as string, "loop", "b"],
          },
          loop: { type: "Stack", children: ["main", "loop"] },
        }),
      ),
    ).toBe("b");
  });
});
