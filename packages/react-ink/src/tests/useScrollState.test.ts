import { describe, expect, it } from "vitest";
import {
  buildEffectiveScrollState,
  clampScrollOffset,
  createInitialScrollState,
  deriveScrollState,
  scrollStateReducer,
  type ScrollDerivedState,
  type ScrollState,
} from "../primitives/scroll/useScrollState";

const createDerived = (
  state: ScrollState,
  overrides: Partial<ScrollDerivedState> = {},
): ScrollDerivedState => {
  return {
    contentHeight: 9,
    maxScrollOffset: 5,
    visibleFirstIndex: 0,
    visibleLastIndex: 2,
    isAtBottom: state.scrollOffset >= 3,
    itemOffsets: [],
    itemHeightsInOrder: [],
    ...overrides,
  };
};

describe("useScrollState", () => {
  it("clamps scroll offsets within the valid range", () => {
    expect(clampScrollOffset(-2, 5)).toBe(0);
    expect(clampScrollOffset(3, 5)).toBe(3);
    expect(clampScrollOffset(8, 5)).toBe(5);
  });

  it("derives viewport bounds from item heights", () => {
    const derived = deriveScrollState({
      scrollOffset: 2,
      autoScroll: false,
      viewportHeight: 3,
      itemHeights: new Map([
        ["a", 1],
        ["b", 2],
        ["c", 3],
      ]),
      itemKeyOrder: ["a", "b", "c"],
      itemCount: 3,
      stickToBottomThreshold: 1,
    });

    expect(derived.contentHeight).toBe(6);
    expect(derived.maxScrollOffset).toBe(3);
    expect(derived.visibleFirstIndex).toBe(1);
    expect(derived.visibleLastIndex).toBe(2);
    expect(derived.isAtBottom).toBe(true);
  });

  it("scrolls by a fixed amount and disables auto scroll when leaving the threshold", () => {
    const initial = createInitialScrollState({
      viewportHeight: 4,
      itemKeyOrder: ["a", "b", "c"],
      itemCount: 3,
    });

    const next = scrollStateReducer(initial, {
      type: "scrollBy",
      rows: -3,
      derived: createDerived(initial, { maxScrollOffset: 6 }),
      stickToBottomThreshold: 1,
    });

    expect(next.scrollOffset).toBe(0);
    expect(next.autoScroll).toBe(false);
  });

  it("scrolls by one page using the current viewport height", () => {
    const state = createInitialScrollState({
      viewportHeight: 3,
      itemKeyOrder: ["a", "b", "c", "d"],
      itemCount: 4,
      scrollOffset: 2,
      autoScroll: false,
    });

    const next = scrollStateReducer(state, {
      type: "scrollByPage",
      direction: "down",
      derived: createDerived(state, { maxScrollOffset: 8 }),
      stickToBottomThreshold: 1,
    });

    expect(next.scrollOffset).toBe(5);
  });

  it("scrolls an item to the top or bottom edge", () => {
    const state = createInitialScrollState({
      viewportHeight: 4,
      itemKeyOrder: ["a", "b", "c"],
      itemCount: 3,
      autoScroll: false,
    });

    const topAligned = scrollStateReducer(state, {
      type: "scrollToItem",
      index: 2,
      align: "top",
      derived: {
        ...createDerived(state, { maxScrollOffset: 6 }),
        itemOffsets: [0, 2, 5],
        itemHeightsInOrder: [2, 3, 2],
      },
      stickToBottomThreshold: 1,
    });

    const bottomAligned = scrollStateReducer(state, {
      type: "scrollToItem",
      index: 2,
      align: "bottom",
      derived: {
        ...createDerived(state, { maxScrollOffset: 6 }),
        itemOffsets: [0, 2, 5],
        itemHeightsInOrder: [2, 3, 2],
      },
      stickToBottomThreshold: 1,
    });

    expect(topAligned.scrollOffset).toBe(5);
    expect(bottomAligned.scrollOffset).toBe(3);
  });

  it("pins to the new bottom when content grows while auto scroll is enabled", () => {
    const externalState = {
      viewportHeight: 4,
      itemHeights: new Map([
        ["a", 1],
        ["b", 1],
      ]),
      itemKeyOrder: ["a", "b"],
      itemCount: 2,
      stickToBottomThreshold: 1,
    };
    const state = createInitialScrollState({
      ...externalState,
      scrollOffset: 2,
      autoScroll: true,
    });

    const next = buildEffectiveScrollState(externalState, {
      scrollOffset: state.scrollOffset,
      autoScroll: state.autoScroll,
    });

    const grown = buildEffectiveScrollState(
      {
        ...externalState,
        itemHeights: new Map([
          ["a", 1],
          ["b", 10],
        ]),
      },
      {
        scrollOffset: next.fullState.scrollOffset,
        autoScroll: next.fullState.autoScroll,
      },
    );

    expect(grown.fullState.scrollOffset).toBe(7);
    expect(grown.fullState.autoScroll).toBe(true);
  });

  it("preserves the current offset when content grows while auto scroll is paused", () => {
    const externalState = {
      viewportHeight: 4,
      itemHeights: new Map([
        ["a", 3],
        ["b", 3],
      ]),
      itemKeyOrder: ["a", "b"],
      itemCount: 2,
      stickToBottomThreshold: 1,
    };
    const state = createInitialScrollState({
      ...externalState,
      scrollOffset: 1,
      autoScroll: false,
    });

    const next = buildEffectiveScrollState(externalState, {
      scrollOffset: state.scrollOffset,
      autoScroll: state.autoScroll,
    });

    const grown = buildEffectiveScrollState(
      {
        ...externalState,
        itemHeights: new Map([
          ["a", 3],
          ["b", 8],
        ]),
      },
      {
        scrollOffset: next.fullState.scrollOffset,
        autoScroll: next.fullState.autoScroll,
      },
    );

    expect(grown.fullState.scrollOffset).toBe(1);
    expect(grown.fullState.autoScroll).toBe(false);
  });

  it("returns the same state object for no-op derived syncs", () => {
    const externalState = {
      viewportHeight: 4,
      itemHeights: new Map([
        ["a", 1],
        ["b", 1],
      ]),
      itemKeyOrder: ["a", "b"],
      itemCount: 2,
      stickToBottomThreshold: 2,
    };
    const state = createInitialScrollState({
      ...externalState,
      scrollOffset: 0,
      autoScroll: true,
    });

    const next = buildEffectiveScrollState(externalState, {
      scrollOffset: state.scrollOffset,
      autoScroll: state.autoScroll,
    });

    expect(next.fullState.scrollOffset).toBe(state.scrollOffset);
    expect(next.fullState.autoScroll).toBe(state.autoScroll);
  });
});
