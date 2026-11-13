import { expect, it } from "vitest";
import { BLOCKS } from "@/lib/blocks";
import { hasBlockPreview } from "./block-preview";

it("runs a live preview for every block the registry ships", () => {
  expect(BLOCKS.length).toBeGreaterThan(0);
  expect(
    BLOCKS.filter((block) => !hasBlockPreview(block.slug)).map(
      (block) => block.slug,
    ),
  ).toEqual([]);
});
