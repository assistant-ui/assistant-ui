import { describe, expect, it } from "vitest";
import {
  isUserScrollUp,
  isViewportAtBottom,
  viewportOverflows,
} from "./viewport-scroll";

describe("viewport scroll metrics", () => {
  it("computes bottom pinning from viewport metrics", () => {
    expect(
      isViewportAtBottom({
        scrollTop: 900,
        scrollHeight: 1000,
        clientHeight: 100,
      }),
    ).toBe(true);
    expect(
      isViewportAtBottom({
        scrollTop: 899,
        scrollHeight: 1000,
        clientHeight: 100,
      }),
    ).toBe(true);
    expect(
      isViewportAtBottom({
        scrollTop: 800,
        scrollHeight: 1000,
        clientHeight: 100,
      }),
    ).toBe(false);
    expect(
      isViewportAtBottom({ scrollTop: 0, scrollHeight: 80, clientHeight: 100 }),
    ).toBe(true);

    expect(
      viewportOverflows({
        scrollTop: 0,
        scrollHeight: 1000,
        clientHeight: 100,
      }),
    ).toBe(true);
    expect(
      viewportOverflows({ scrollTop: 0, scrollHeight: 100, clientHeight: 100 }),
    ).toBe(false);
  });

  it("accounts for a bottom content inset when requested", () => {
    const metrics = {
      scrollTop: 350,
      scrollHeight: 500,
      clientHeight: 100,
    };

    expect(isViewportAtBottom(metrics)).toBe(false);
    expect(isViewportAtBottom(metrics, 50)).toBe(true);
    expect(viewportOverflows(metrics, 450)).toBe(false);
  });

  it("distinguishes user scroll-up from content-driven shifts", () => {
    expect(
      isUserScrollUp(
        { scrollTop: 500, scrollHeight: 1000 },
        { scrollTop: 400, scrollHeight: 1000, clientHeight: 100 },
      ),
    ).toBe(true);
    expect(
      isUserScrollUp(
        { scrollTop: 500, scrollHeight: 900 },
        { scrollTop: 400, scrollHeight: 1000, clientHeight: 100 },
      ),
    ).toBe(false);
    expect(
      isUserScrollUp(
        { scrollTop: 400, scrollHeight: 1000 },
        { scrollTop: 500, scrollHeight: 1000, clientHeight: 100 },
      ),
    ).toBe(false);
  });
});
