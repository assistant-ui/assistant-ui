import { describe, expect, it } from "vitest";
import {
  computeTopAnchorReserve,
  computeTopAnchorTargetScrollTop,
} from "./computeTopAnchorSlack";

const makeElement = ({
  top = 0,
  height = 0,
  scrollTop = 0,
  scrollHeight = 0,
  clientHeight = 0,
  offsetHeight = height,
  offsetTop = top,
  offsetParent = null,
}: {
  top?: number;
  height?: number;
  scrollTop?: number;
  scrollHeight?: number;
  clientHeight?: number;
  offsetHeight?: number;
  offsetTop?: number;
  offsetParent?: HTMLElement | null;
}) =>
  ({
    scrollTop,
    scrollHeight,
    clientHeight,
    offsetHeight,
    offsetTop,
    offsetParent,
    getBoundingClientRect: () => ({
      top,
      height,
    }),
  }) as HTMLElement;

describe("computeTopAnchorTargetScrollTop", () => {
  it("uses layout offset geometry instead of the anchor's transformed visual position", () => {
    const viewport = makeElement({ offsetTop: 0 });
    const anchor = makeElement({
      top: 160,
      height: 60,
      offsetTop: 156,
      offsetParent: viewport,
    });

    expect(
      computeTopAnchorTargetScrollTop({
        viewport,
        anchor,
        tallerThan: 160,
        visibleHeight: 96,
      }),
    ).toBe(156);
  });

  it("over-scrolls tall anchors so only visibleHeight is visible", () => {
    const viewport = makeElement({ offsetTop: 0 });
    const anchor = makeElement({ height: 240, offsetTop: 200 });

    // 240 > 160 threshold => keep 96 visible => over-scroll by 240 - 96 = 144
    expect(
      computeTopAnchorTargetScrollTop({
        viewport,
        anchor,
        tallerThan: 160,
        visibleHeight: 96,
      }),
    ).toBe(200 + 144);
  });
});

describe("computeTopAnchorReserve", () => {
  it("reserves only the extra height needed to make the anchor target reachable", () => {
    const viewport = makeElement({
      offsetTop: 0,
      scrollTop: 0,
      scrollHeight: 560,
      clientHeight: 400,
    });
    const anchor = makeElement({ height: 64, offsetTop: 220 });
    const reserve = makeElement({ offsetHeight: 0 });

    expect(
      computeTopAnchorReserve({
        viewport,
        anchor,
        reserve,
        tallerThan: 160,
        visibleHeight: 96,
      }),
    ).toBe(60);
  });

  it("shrinks as the response content grows", () => {
    const anchor = makeElement({ height: 64, offsetTop: 220 });
    const reserve = makeElement({ offsetHeight: 60 });

    expect(
      computeTopAnchorReserve({
        viewport: makeElement({
          offsetTop: 0,
          scrollTop: 0,
          scrollHeight: 620,
          clientHeight: 400,
        }),
        anchor,
        reserve,
        tallerThan: 160,
        visibleHeight: 96,
      }),
    ).toBe(60);

    expect(
      computeTopAnchorReserve({
        viewport: makeElement({
          offsetTop: 0,
          scrollTop: 0,
          scrollHeight: 680,
          clientHeight: 400,
        }),
        anchor,
        reserve,
        tallerThan: 160,
        visibleHeight: 96,
      }),
    ).toBe(0);
  });
});
