import { describe, expect, it } from "vitest";
import {
  buildEffectiveThreadViewportState,
  clampThreadViewportScrollOffset,
  createInitialThreadViewportState,
  deriveThreadViewportState,
  threadViewportStateReducer,
  type ThreadViewportDerivedState,
  type ThreadViewportState,
} from "../primitives/thread/useThreadViewportState";

const createDerived = (
  state: ThreadViewportState,
  overrides: Partial<ThreadViewportDerivedState> = {},
): ThreadViewportDerivedState => ({
  contentHeight: 9,
  maxScrollOffset: 5,
  visibleFirstIndex: 0,
  visibleLastIndex: 2,
  isAtBottom: state.scrollOffset >= 3,
  messageOffsets: [],
  messageHeightsInOrder: [],
  ...overrides,
});

describe("thread viewport state", () => {
  it("clamps negative and too-large scroll offsets", () => {
    expect(clampThreadViewportScrollOffset(-2, 5)).toBe(0);
    expect(clampThreadViewportScrollOffset(3, 5)).toBe(3);
    expect(clampThreadViewportScrollOffset(8, 5)).toBe(5);
  });

  it("derives content height, visible indexes, max offset, and bottom state", () => {
    const derived = deriveThreadViewportState({
      scrollOffset: 2,
      autoScroll: false,
      viewportHeight: 3,
      messageHeights: new Map([
        ["a", 1],
        ["b", 2],
        ["c", 3],
      ]),
      messageKeyOrder: ["a", "b", "c"],
      stickToBottomThreshold: 1,
    });

    expect(derived.contentHeight).toBe(6);
    expect(derived.maxScrollOffset).toBe(3);
    expect(derived.visibleFirstIndex).toBe(1);
    expect(derived.visibleLastIndex).toBe(2);
    expect(derived.isAtBottom).toBe(true);
  });

  it("scrollByPage moves by viewport height", () => {
    const state = createInitialThreadViewportState({
      viewportHeight: 3,
      messageKeyOrder: ["a", "b", "c", "d"],
      scrollOffset: 2,
      autoScroll: false,
    });

    const down = threadViewportStateReducer(state, {
      type: "scrollByPage",
      direction: "down",
      derived: createDerived(state, { maxScrollOffset: 8 }),
      stickToBottomThreshold: 1,
    });
    const up = threadViewportStateReducer(down, {
      type: "scrollByPage",
      direction: "up",
      derived: createDerived(down, { maxScrollOffset: 8 }),
      stickToBottomThreshold: 1,
    });

    expect(down.scrollOffset).toBe(5);
    expect(up.scrollOffset).toBe(2);
  });

  it("scrollToBottom pins to max offset and enables auto-scroll", () => {
    const state = createInitialThreadViewportState({
      viewportHeight: 3,
      messageKeyOrder: ["a", "b", "c"],
      scrollOffset: 0,
      autoScroll: false,
    });

    const next = threadViewportStateReducer(state, {
      type: "scrollToBottom",
      derived: createDerived(state, { maxScrollOffset: 7 }),
      stickToBottomThreshold: 1,
    });

    expect(next.scrollOffset).toBe(7);
    expect(next.autoScroll).toBe(true);
  });

  it("scrolling up beyond the threshold disables auto-scroll", () => {
    const state = createInitialThreadViewportState({
      viewportHeight: 4,
      messageKeyOrder: ["a", "b", "c"],
      scrollOffset: 6,
      autoScroll: true,
    });

    const next = threadViewportStateReducer(state, {
      type: "scrollBy",
      rows: -4,
      derived: createDerived(state, { maxScrollOffset: 6 }),
      stickToBottomThreshold: 1,
    });

    expect(next.scrollOffset).toBe(2);
    expect(next.autoScroll).toBe(false);
  });

  it("content growth while auto-scroll is enabled keeps the viewport pinned to bottom", () => {
    const externalState = {
      viewportHeight: 4,
      messageHeights: new Map([
        ["a", 1],
        ["b", 1],
      ]),
      messageKeyOrder: ["a", "b"],
      stickToBottomThreshold: 1,
    };

    const grown = buildEffectiveThreadViewportState(
      {
        ...externalState,
        messageHeights: new Map([
          ["a", 1],
          ["b", 10],
        ]),
      },
      {
        scrollOffset: 0,
        autoScroll: true,
      },
    );

    expect(grown.fullState.scrollOffset).toBe(7);
    expect(grown.fullState.autoScroll).toBe(true);
  });

  it("content growth while auto-scroll is paused preserves current offset", () => {
    const grown = buildEffectiveThreadViewportState(
      {
        viewportHeight: 4,
        messageHeights: new Map([
          ["a", 3],
          ["b", 8],
        ]),
        messageKeyOrder: ["a", "b"],
        stickToBottomThreshold: 1,
      },
      {
        scrollOffset: 1,
        autoScroll: false,
      },
    );

    expect(grown.fullState.scrollOffset).toBe(1);
    expect(grown.fullState.autoScroll).toBe(false);
  });

  it("empty message lists report sensible zero state", () => {
    const derived = deriveThreadViewportState(
      createInitialThreadViewportState({ viewportHeight: 4 }),
    );

    expect(derived.contentHeight).toBe(0);
    expect(derived.maxScrollOffset).toBe(0);
    expect(derived.visibleFirstIndex).toBe(0);
    expect(derived.visibleLastIndex).toBe(0);
    expect(derived.isAtBottom).toBe(true);
  });
});
