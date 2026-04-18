import { useCallback, useMemo, useRef, useState, type Dispatch } from "react";
import { arraysEqual, mapsEqual } from "./utils";

export type ScrollKey = string | number;

export type ScrollState = {
  scrollOffset: number;
  autoScroll: boolean;
  viewportHeight: number;
  itemHeights: Map<ScrollKey, number>;
  itemKeyOrder: ScrollKey[];
  itemCount: number;
  stickToBottomThreshold: number;
};

export type ScrollDerivedState = {
  contentHeight: number;
  maxScrollOffset: number;
  visibleFirstIndex: number;
  visibleLastIndex: number;
  isAtBottom: boolean;
  itemOffsets: number[];
  itemHeightsInOrder: number[];
};

type ScrollReducerAction =
  | {
      type: "scrollBy";
      rows: number;
      derived: ScrollDerivedState;
      stickToBottomThreshold: number;
    }
  | {
      type: "scrollByPage";
      direction: "up" | "down";
      derived: ScrollDerivedState;
      stickToBottomThreshold: number;
    }
  | {
      type: "scrollToTop";
      derived: ScrollDerivedState;
      stickToBottomThreshold: number;
    }
  | {
      type: "scrollToBottom";
      derived: ScrollDerivedState;
      stickToBottomThreshold: number;
    }
  | {
      type: "scrollToItem";
      index: number;
      align?: "top" | "bottom";
      derived: ScrollDerivedState;
      stickToBottomThreshold: number;
    }
  | {
      type: "setAutoScroll";
      enabled: boolean;
      derived: ScrollDerivedState;
      stickToBottomThreshold: number;
    };

export const clampScrollOffset = (offset: number, maxScrollOffset: number) => {
  return Math.max(0, Math.min(offset, Math.max(0, maxScrollOffset)));
};

const resolveAutoScroll = (
  scrollOffset: number,
  maxScrollOffset: number,
  stickToBottomThreshold: number,
) => {
  return maxScrollOffset - scrollOffset <= stickToBottomThreshold;
};

const getStateIfChanged = (
  previous: ScrollState,
  next: ScrollState,
): ScrollState => {
  return previous.scrollOffset === next.scrollOffset &&
    previous.autoScroll === next.autoScroll &&
    previous.viewportHeight === next.viewportHeight &&
    previous.itemCount === next.itemCount &&
    previous.stickToBottomThreshold === next.stickToBottomThreshold &&
    mapsEqual(previous.itemHeights, next.itemHeights) &&
    arraysEqual(previous.itemKeyOrder, next.itemKeyOrder)
    ? previous
    : next;
};

const finalizeAgainstDerived = (
  state: ScrollState,
  scrollOffset: number,
  derived: ScrollDerivedState,
  stickToBottomThreshold: number,
) => {
  const clampedOffset = clampScrollOffset(
    scrollOffset,
    derived.maxScrollOffset,
  );
  return getStateIfChanged(state, {
    ...state,
    scrollOffset: clampedOffset,
    autoScroll: resolveAutoScroll(
      clampedOffset,
      derived.maxScrollOffset,
      stickToBottomThreshold,
    ),
  });
};

export const createInitialScrollState = ({
  viewportHeight = 0,
  itemHeights = new Map<ScrollKey, number>(),
  itemKeyOrder = [],
  itemCount = itemKeyOrder.length,
  scrollOffset = 0,
  autoScroll = true,
  stickToBottomThreshold = 2,
}: Partial<ScrollState> = {}): ScrollState => {
  return {
    scrollOffset,
    autoScroll,
    viewportHeight,
    itemHeights,
    itemKeyOrder,
    itemCount,
    stickToBottomThreshold,
  };
};

export const deriveScrollState = (state: ScrollState): ScrollDerivedState => {
  let contentHeight = 0;
  const itemOffsets: number[] = [];
  const itemHeightsInOrder = state.itemKeyOrder.map((key) => {
    const height = Math.max(1, state.itemHeights.get(key) ?? 1);
    itemOffsets.push(contentHeight);
    contentHeight += height;
    return height;
  });

  const maxScrollOffset = Math.max(0, contentHeight - state.viewportHeight);
  const viewportBottom = state.scrollOffset + Math.max(0, state.viewportHeight);

  let visibleFirstIndex = state.itemCount === 0 ? 0 : state.itemCount - 1;
  let visibleLastIndex = state.itemCount === 0 ? 0 : state.itemCount - 1;

  if (state.itemCount > 0) {
    for (let index = 0; index < state.itemCount; index++) {
      const top = itemOffsets[index] ?? 0;
      const bottom = top + (itemHeightsInOrder[index] ?? 1);
      if (bottom > state.scrollOffset) {
        visibleFirstIndex = index;
        break;
      }
    }

    for (let index = visibleFirstIndex; index < state.itemCount; index++) {
      const top = itemOffsets[index] ?? 0;
      if (top >= viewportBottom) {
        visibleLastIndex = Math.max(visibleFirstIndex, index - 1);
        break;
      }
      visibleLastIndex = index;
    }
  }

  return {
    contentHeight,
    maxScrollOffset,
    visibleFirstIndex,
    visibleLastIndex,
    isAtBottom: resolveAutoScroll(
      state.scrollOffset,
      maxScrollOffset,
      state.stickToBottomThreshold,
    ),
    itemOffsets,
    itemHeightsInOrder,
  };
};

export const scrollStateReducer = (
  state: ScrollState,
  action: ScrollReducerAction,
): ScrollState => {
  switch (action.type) {
    case "scrollBy":
      return finalizeAgainstDerived(
        state,
        state.scrollOffset + action.rows,
        action.derived,
        action.stickToBottomThreshold,
      );
    case "scrollByPage":
      return finalizeAgainstDerived(
        state,
        state.scrollOffset +
          (action.direction === "down"
            ? state.viewportHeight
            : -state.viewportHeight),
        action.derived,
        action.stickToBottomThreshold,
      );
    case "scrollToTop":
      return finalizeAgainstDerived(
        state,
        0,
        action.derived,
        action.stickToBottomThreshold,
      );
    case "scrollToBottom":
      return getStateIfChanged(state, {
        ...state,
        scrollOffset: action.derived.maxScrollOffset,
        autoScroll: true,
      });
    case "scrollToItem": {
      const itemTop = action.derived.itemOffsets[action.index] ?? 0;
      const itemHeight = action.derived.itemHeightsInOrder[action.index] ?? 1;
      const nextOffset =
        action.align === "bottom"
          ? itemTop + itemHeight - state.viewportHeight
          : itemTop;
      return finalizeAgainstDerived(
        state,
        nextOffset,
        action.derived,
        action.stickToBottomThreshold,
      );
    }
    case "setAutoScroll":
      return action.enabled
        ? scrollStateReducer(state, {
            type: "scrollToBottom",
            derived: action.derived,
            stickToBottomThreshold: action.stickToBottomThreshold,
          })
        : getStateIfChanged(state, { ...state, autoScroll: false });
    default:
      return state;
  }
};

export type UseScrollStateOptions = {
  viewportHeight: number;
  itemHeights: Map<ScrollKey, number>;
  itemKeyOrder: ScrollKey[];
  itemCount: number;
  stickToBottomThreshold?: number;
  initialScrollToBottom?: boolean;
};

type InternalScrollState = Pick<ScrollState, "scrollOffset" | "autoScroll">;

type ScrollExternalState = Omit<ScrollState, "scrollOffset" | "autoScroll">;

export const buildEffectiveScrollState = (
  externalState: ScrollExternalState,
  internalState: InternalScrollState,
) => {
  const rawState: ScrollState = {
    ...externalState,
    scrollOffset: internalState.scrollOffset,
    autoScroll: internalState.autoScroll,
  };
  const rawDerived = deriveScrollState(rawState);
  const fullState: ScrollState = {
    ...rawState,
    scrollOffset: internalState.autoScroll
      ? rawDerived.maxScrollOffset
      : clampScrollOffset(
          internalState.scrollOffset,
          rawDerived.maxScrollOffset,
        ),
  };

  return {
    fullState,
    derived:
      fullState.scrollOffset === rawState.scrollOffset
        ? rawDerived
        : deriveScrollState(fullState),
  };
};

export const useScrollState = ({
  viewportHeight,
  itemHeights,
  itemKeyOrder,
  itemCount,
  stickToBottomThreshold = 2,
  initialScrollToBottom = true,
}: UseScrollStateOptions) => {
  const [internalState, setInternalState] = useState(() => ({
    scrollOffset: 0,
    autoScroll: initialScrollToBottom,
  }));

  const externalState = useMemo<ScrollExternalState>(
    () => ({
      viewportHeight,
      itemHeights,
      itemKeyOrder,
      itemCount,
      stickToBottomThreshold,
    }),
    [
      viewportHeight,
      itemHeights,
      itemKeyOrder,
      itemCount,
      stickToBottomThreshold,
    ],
  );

  const { fullState, derived } = useMemo(
    () => buildEffectiveScrollState(externalState, internalState),
    [externalState, internalState],
  );

  const latestRef = useRef<ScrollExternalState>(externalState);
  latestRef.current = externalState;

  const dispatchWithDerived = useCallback((action: ScrollDispatchAction) => {
    setInternalState((previous) => {
      const latest = latestRef.current;
      const current = buildEffectiveScrollState(latest, previous);
      const nextState = scrollStateReducer(current.fullState, {
        ...action,
        derived: current.derived,
        stickToBottomThreshold: latest.stickToBottomThreshold,
      } as ScrollReducerAction);

      return previous.scrollOffset === nextState.scrollOffset &&
        previous.autoScroll === nextState.autoScroll
        ? previous
        : {
            scrollOffset: nextState.scrollOffset,
            autoScroll: nextState.autoScroll,
          };
    });
  }, []);

  return {
    state: fullState,
    derived,
    dispatchWithDerived,
  };
};

export type ScrollStateActions = {
  scrollBy: (rows: number) => void;
  scrollByPage: (direction: "up" | "down") => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  scrollToItem: (index: number, align?: "top" | "bottom") => void;
  setAutoScroll: (enabled: boolean) => void;
};

type ScrollDispatchAction =
  | {
      type: "scrollBy";
      rows: number;
    }
  | {
      type: "scrollByPage";
      direction: "up" | "down";
    }
  | {
      type: "scrollToTop";
    }
  | {
      type: "scrollToBottom";
    }
  | {
      type: "scrollToItem";
      index: number;
      align?: "top" | "bottom" | undefined;
    }
  | {
      type: "setAutoScroll";
      enabled: boolean;
    };

export const createScrollActions = (
  dispatchWithDerived: Dispatch<ScrollDispatchAction>,
): ScrollStateActions => {
  return {
    scrollBy: (rows) => dispatchWithDerived({ type: "scrollBy", rows }),
    scrollByPage: (direction) =>
      dispatchWithDerived({ type: "scrollByPage", direction }),
    scrollToTop: () => dispatchWithDerived({ type: "scrollToTop" }),
    scrollToBottom: () => dispatchWithDerived({ type: "scrollToBottom" }),
    scrollToItem: (index, align) =>
      dispatchWithDerived({ type: "scrollToItem", index, align }),
    setAutoScroll: (enabled) =>
      dispatchWithDerived({ type: "setAutoScroll", enabled }),
  };
};
