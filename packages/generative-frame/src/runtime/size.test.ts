import { describe, expect, it } from "vitest";
import { measureRoot, reportableSize } from "./size";

const rootWith = (width: number, height: number) => {
  const root = document.createElement("div");
  root.getBoundingClientRect = () =>
    ({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
    }) as DOMRect;
  return root;
};

describe("reportableSize", () => {
  it("reports the root's content size, rounded up", () => {
    expect(reportableSize(rootWith(565.2, 335.4))).toEqual({
      width: 566,
      height: 336,
    });
  });

  it("skips a zero-width layout, whose wrapped height is not the content's", () => {
    const collapsed = rootWith(0, 2257);
    expect(reportableSize(collapsed)).toBeUndefined();
    expect(measureRoot(collapsed)).toEqual({ width: 0, height: 2257 });
  });
});
