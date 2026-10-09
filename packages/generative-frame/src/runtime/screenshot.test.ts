import { describe, expect, it } from "vitest";
import { measureCapture } from "./screenshot";

const stubRoot = (box: {
  width: number;
  height: number;
  scrollWidth: number;
  scrollHeight: number;
}) => {
  const root = document.createElement("div");
  root.getBoundingClientRect = () =>
    ({ width: box.width, height: box.height }) as DOMRect;
  Object.defineProperty(root, "scrollWidth", { value: box.scrollWidth });
  Object.defineProperty(root, "scrollHeight", { value: box.scrollHeight });
  return root;
};

describe("measureCapture", () => {
  it("captures content that overflows the root to the right and below", () => {
    const root = stubRoot({
      width: 680.4,
      height: 300,
      scrollWidth: 742,
      scrollHeight: 512,
    });
    expect(measureCapture(root)).toEqual({
      layoutWidth: 681,
      width: 742,
      height: 512,
    });
  });

  it("keeps the layout width when nothing overflows", () => {
    const root = stubRoot({
      width: 680,
      height: 300,
      scrollWidth: 680,
      scrollHeight: 300,
    });
    expect(measureCapture(root)).toEqual({
      layoutWidth: 680,
      width: 680,
      height: 300,
    });
  });
});
