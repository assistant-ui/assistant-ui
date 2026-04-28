import { describe, expect, it } from "vitest";
import {
  computeTopAnchorReserve,
  computeTopAnchorSlack,
  computeTopAnchorTargetScrollTop,
} from "./computeTopAnchorSlack";

const makeElement = ({
  top = 0,
  height = 0,
  scrollTop = 0,
  scrollHeight = 0,
  clientHeight = 0,
  offsetHeight = height,
}: {
  top?: number;
  height?: number;
  scrollTop?: number;
  scrollHeight?: number;
  clientHeight?: number;
  offsetHeight?: number;
}) =>
  ({
    scrollTop,
    scrollHeight,
    clientHeight,
    offsetHeight,
    getBoundingClientRect: () => ({
      top,
      height,
    }),
  }) as HTMLElement;

describe("computeTopAnchorTargetScrollTop", () => {
  it("targets the anchor's offset within the scroll content for short anchors", () => {
    const viewport = makeElement({ top: 0, scrollTop: 0 });
    const anchor = makeElement({ top: 160, height: 60 });

    expect(
      computeTopAnchorTargetScrollTop({
        viewport,
        anchor,
        fillClampThreshold: 160,
        fillClampOffset: 96,
      }),
    ).toBe(160);
  });

  it("accounts for the viewport's own offset and current scroll position", () => {
    const viewport = makeElement({ top: 24, scrollTop: 140 });
    const anchor = makeElement({ top: 284, height: 72 });

    // anchor offset within scroll content = (284 - 24) + 140 = 400
    expect(
      computeTopAnchorTargetScrollTop({
        viewport,
        anchor,
        fillClampThreshold: 160,
        fillClampOffset: 96,
      }),
    ).toBe(400);
  });

  it("over-scrolls tall anchors so only fillClampOffset is visible", () => {
    const viewport = makeElement({ top: 0, scrollTop: 0 });
    const anchor = makeElement({ top: 200, height: 240 });

    // 240 > 160 threshold => keep 96 visible => over-scroll by 240 - 96 = 144
    expect(
      computeTopAnchorTargetScrollTop({
        viewport,
        anchor,
        fillClampThreshold: 160,
        fillClampOffset: 96,
      }),
    ).toBe(200 + 144);
  });
});

describe("computeTopAnchorSlack", () => {
  it("returns 0 when the anchor target already fits in the scroll range", () => {
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

  it("uses the tall-anchor target when computing missing range", () => {
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

describe("computeTopAnchorReserve", () => {
  it("reserves only the extra height needed to make the anchor target reachable", () => {
    const viewport = makeElement({
      top: 0,
      scrollTop: 0,
      scrollHeight: 560,
      clientHeight: 400,
    });
    const anchor = makeElement({ top: 220, height: 64 });
    const reserve = makeElement({ offsetHeight: 0 });

    expect(
      computeTopAnchorReserve({
        viewport,
        anchor,
        reserve,
        fillClampThreshold: 160,
        fillClampOffset: 96,
      }),
    ).toBe(60);
  });

  it("shrinks as the response content grows", () => {
    const anchor = makeElement({ top: 220, height: 64 });
    const reserve = makeElement({ offsetHeight: 60 });

    expect(
      computeTopAnchorReserve({
        viewport: makeElement({
          top: 0,
          scrollTop: 0,
          scrollHeight: 620,
          clientHeight: 400,
        }),
        anchor,
        reserve,
        fillClampThreshold: 160,
        fillClampOffset: 96,
      }),
    ).toBe(60);

    expect(
      computeTopAnchorReserve({
        viewport: makeElement({
          top: 0,
          scrollTop: 0,
          scrollHeight: 680,
          clientHeight: 400,
        }),
        anchor,
        reserve,
        fillClampThreshold: 160,
        fillClampOffset: 96,
      }),
    ).toBe(0);
  });
});
