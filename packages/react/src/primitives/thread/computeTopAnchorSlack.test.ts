import { describe, expect, it } from "vitest";
import { computeTopAnchorSlack } from "./computeTopAnchorSlack";

const makeElement = ({
  top = 0,
  height = 0,
  scrollTop = 0,
  scrollHeight = 0,
  clientHeight = 0,
}: {
  top?: number;
  height?: number;
  scrollTop?: number;
  scrollHeight?: number;
  clientHeight?: number;
}) =>
  ({
    scrollTop,
    scrollHeight,
    clientHeight,
    getBoundingClientRect: () => ({
      top,
      height,
    }),
  }) as HTMLElement;

describe("computeTopAnchorSlack", () => {
  it("returns 0 when the anchor already fits in the scroll range", () => {
    const viewport = makeElement({
      top: 100,
      scrollTop: 20,
      scrollHeight: 700,
      clientHeight: 300,
    });
    const anchor = makeElement({ top: 180, height: 60 });

    expect(
      computeTopAnchorSlack({
        viewport,
        anchor,
        fillClampThreshold: 160,
        fillClampOffset: 96,
      }),
    ).toBe(0);
  });

  it("returns the exact missing scroll range", () => {
    const viewport = makeElement({
      top: 0,
      scrollTop: 10,
      scrollHeight: 360,
      clientHeight: 200,
    });
    const anchor = makeElement({ top: 170, height: 40 });

    expect(
      computeTopAnchorSlack({
        viewport,
        anchor,
        fillClampThreshold: 160,
        fillClampOffset: 96,
      }),
    ).toBe(20);
  });

  it("derives correctness from geometry when spacing changes", () => {
    const viewport = makeElement({
      top: 24,
      scrollTop: 140,
      scrollHeight: 620,
      clientHeight: 320,
    });
    const anchor = makeElement({ top: 284, height: 72 });

    expect(
      computeTopAnchorSlack({
        viewport,
        anchor,
        fillClampThreshold: 160,
        fillClampOffset: 96,
      }),
    ).toBe(100);
  });

  it("uses fillClampOffset for tall user messages", () => {
    const viewport = makeElement({
      top: 0,
      scrollTop: 0,
      scrollHeight: 500,
      clientHeight: 300,
    });
    const anchor = makeElement({ top: 260, height: 240 });

    expect(
      computeTopAnchorSlack({
        viewport,
        anchor,
        fillClampThreshold: 160,
        fillClampOffset: 96,
      }),
    ).toBe(204);
  });
});
