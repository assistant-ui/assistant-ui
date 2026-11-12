import { describe, expect, it } from "vitest";
import { exceedsRenderBudget } from "./tree";
import type { Spec } from "./types";

describe("exceedsRenderBudget", () => {
  it("counts child entries that are not element ids", () => {
    const spec = {
      root: "list",
      elements: {
        list: {
          type: "Stack",
          repeat: { path: "/items" },
          children: [1, 2],
        },
      },
    } as unknown as Spec;
    expect(exceedsRenderBudget(spec, { items: Array(2000).fill(0) })).toBe(
      false,
    );
    expect(exceedsRenderBudget(spec, { items: Array(3000).fill(0) })).toBe(
      true,
    );
  });
});
