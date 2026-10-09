import { describe, expect, it } from "vitest";
import { layoutFrames, type FrameInput, type Rect } from "./outline";

const viewport = { width: 1000, height: 800 };
const tab = { width: 120, height: 20 };

const frame = (
  key: string,
  content: Rect,
  ancestors: string[] = [],
): FrameInput => ({ key, content, ancestors, tab });

const rect = (top: number, left: number, right: number, bottom: number) => ({
  top,
  left,
  right,
  bottom,
});

const layout = (frames: FrameInput[]) =>
  Object.fromEntries(
    layoutFrames(frames, viewport).map((placed) => [placed.key, placed]),
  );

const tabRect = (placed: { tab: { top: number; left: number } }) =>
  rect(
    placed.tab.top,
    placed.tab.left,
    placed.tab.left + tab.width,
    placed.tab.top + tab.height,
  );

const intersects = (a: Rect, b: Rect) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

describe("layoutFrames", () => {
  it("pads an isolated frame by the base outset", () => {
    const { a } = layout([frame("a", rect(100, 100, 300, 200))]);
    expect(a!.box).toEqual(rect(97, 97, 303, 203));
    expect(a!.tab).toEqual({ left: 97, top: 74 });
  });

  it("splits the gap between vertically touching siblings so strokes never cross", () => {
    const { a, b } = layout([
      frame("a", rect(100, 0, 500, 200)),
      frame("b", rect(200, 0, 500, 300)),
    ]);
    expect(a!.box.bottom).toBe(199);
    expect(b!.box.top).toBe(201);
    expect(b!.box.top - a!.box.bottom).toBeGreaterThanOrEqual(2);
    expect(a!.box.top).toBe(97);
    expect(b!.box.bottom).toBe(303);
  });

  it("shrinks horizontally adjacent siblings toward their own content", () => {
    const { a, b } = layout([
      frame("a", rect(100, 0, 200, 200)),
      frame("b", rect(100, 204, 400, 200)),
    ]);
    expect(a!.box.right).toBe(201);
    expect(b!.box.left).toBe(203);
  });

  it("leaves far-apart siblings at the full outset", () => {
    const { a, b } = layout([
      frame("a", rect(100, 0, 500, 200)),
      frame("b", rect(260, 0, 500, 300)),
    ]);
    expect(a!.box.bottom).toBe(203);
    expect(b!.box.top).toBe(257);
  });

  it("steps outer frames outward per nesting level", () => {
    const { outer, middle, inner } = layout([
      frame("outer", rect(100, 100, 600, 600)),
      frame("middle", rect(100, 100, 600, 600), ["outer"]),
      frame("inner", rect(100, 100, 600, 600), ["outer", "middle"]),
    ]);
    expect(inner!.box.top).toBe(97);
    expect(middle!.box.top).toBe(93);
    expect(outer!.box.top).toBe(89);
    expect(outer!.box.right).toBe(611);
  });

  it("never lets tabs collide", () => {
    const placed = layout([
      frame("outer", rect(100, 100, 600, 600)),
      frame("inner", rect(100, 100, 600, 600), ["outer"]),
      frame("sibling", rect(0, 700, 900, 100)),
      frame("below", rect(600, 100, 600, 700)),
    ]);
    const tabs = Object.values(placed).map(tabRect);
    for (let i = 0; i < tabs.length; i++) {
      for (let j = i + 1; j < tabs.length; j++) {
        expect(intersects(tabs[i]!, tabs[j]!)).toBe(false);
      }
    }
  });

  it("keeps tabs outside the content and slides a colliding tab along the edge", () => {
    const { outer, inner } = layout([
      frame("outer", rect(100, 100, 600, 600)),
      frame("inner", rect(100, 100, 600, 600), ["outer"]),
    ]);
    expect(outer!.tab).toEqual({ left: 93, top: 70 });
    expect(inner!.tab).toEqual({ left: 93 + tab.width + 6, top: 74 });
  });

  it("moves the tab inside when the edge above is off screen", () => {
    const [placed] = layoutFrames(
      [frame("a", rect(10, 100, 600, 300))],
      viewport,
    );
    expect(placed!.tab).toEqual({ left: 101, top: 11 });
  });

  it("lets hover-only tabs share a spot because only one shows at a time", () => {
    const placed = layoutFrames(
      [
        { ...frame("outer", rect(100, 100, 600, 600)), quiet: true },
        { ...frame("inner", rect(100, 100, 600, 600), ["outer"]), quiet: true },
      ],
      viewport,
    );
    expect(placed.map((item) => item.tab.left)).toEqual([93, 97]);
  });

  it("keeps a tab inside the viewport at the top edge", () => {
    const { a } = layout([frame("a", rect(5, 100, 300, 200))]);
    expect(a!.tab.top).toBeGreaterThanOrEqual(0);
  });

  it("stacks tabs when every candidate spot is taken", () => {
    const frames = [0, 1, 2].map((index) =>
      frame(`f${index}`, rect(0, 0, 100, 30)),
    );
    const placed = layoutFrames(
      frames.map((input, index) => ({
        ...input,
        ancestors: frames.slice(0, index).map((other) => other.key),
      })),
      viewport,
    );
    const tops = placed.map((item) => item.tab.top);
    expect(new Set(tops).size).toBe(3);
  });
});
