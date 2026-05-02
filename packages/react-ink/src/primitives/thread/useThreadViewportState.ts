import { useCallback, useMemo, useRef, useState, type Dispatch } from "react";
import { arraysEqual, mapsEqual } from "./utils";

export type ThreadMessageKey = string | number;

export type ThreadViewportState = {
  scrollOffset: number;
  autoScroll: boolean;
  viewportHeight: number;
  messageHeights: Map<ThreadMessageKey, number>;
  messageKeyOrder: ThreadMessageKey[];
  stickToBottomThreshold: number;
};

export type ThreadViewportDerivedState = {
  contentHeight: number;
  maxScrollOffset: number;
  visibleFirstIndex: number;
  visibleLastIndex: number;
  isAtBottom: boolean;
  messageOffsets: number[];
  messageHeightsInOrder: number[];
};

type ThreadViewportReducerAction =
  | {
      type: "scrollBy";
      rows: number;
      derived: ThreadViewportDerivedState;
      stickToBottomThreshold: number;
    }
  | {
      type: "scrollByPage";
      direction: "up" | "down";
      derived: ThreadViewportDerivedState;
      stickToBottomThreshold: number;
    }
  | {
      type: "scrollToTop";
      derived: ThreadViewportDerivedState;
      stickToBottomThreshold: number;
    }
  | {
      type: "scrollToBottom";
      derived: ThreadViewportDerivedState;
      stickToBottomThreshold: number;
    }
  | {
      type: "scrollToMessage";
      index: number;
      align?: "top" | "bottom";
      derived: ThreadViewportDerivedState;
      stickToBottomThreshold: number;
    }
  | {
      type: "setAutoScroll";
      enabled: boolean;
      derived: ThreadViewportDerivedState;
      stickToBottomThreshold: number;
    };

export type ThreadViewportStateActions = {
  scrollBy: (rows: number) => void;
  scrollByPage: (direction: "up" | "down") => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  scrollToMessage: (index: number, align?: "top" | "bottom") => void;
  setAutoScroll: (enabled: boolean) => void;
};

type ThreadViewportDispatchAction =
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
      type: "scrollToMessage";
      index: number;
      align?: "top" | "bottom" | undefined;
    }
  | {
      type: "setAutoScroll";
      enabled: boolean;
    };

type InternalThreadViewportState = Pick<
  ThreadViewportState,
  "scrollOffset" | "autoScroll"
>;

type ExternalThreadViewportState = Omit<
  ThreadViewportState,
  "scrollOffset" | "autoScroll"
>;

export const clampThreadViewportScrollOffset = (
  offset: number,
  maxScrollOffset: number,
) => Math.max(0, Math.min(offset, Math.max(0, maxScrollOffset)));

const resolveAutoScroll = (
  scrollOffset: number,
  maxScrollOffset: number,
  stickToBottomThreshold: number,
) => maxScrollOffset - scrollOffset <= stickToBottomThreshold;

const getStateIfChanged = (
  previous: ThreadViewportState,
  next: ThreadViewportState,
): ThreadViewportState =>
  previous.scrollOffset === next.scrollOffset &&
  previous.autoScroll === next.autoScroll &&
  previous.viewportHeight === next.viewportHeight &&
  previous.stickToBottomThreshold === next.stickToBottomThreshold &&
  mapsEqual(previous.messageHeights, next.messageHeights) &&
  arraysEqual(previous.messageKeyOrder, next.messageKeyOrder)
    ? previous
    : next;

const finalizeAgainstDerived = (
  state: ThreadViewportState,
  scrollOffset: number,
  derived: ThreadViewportDerivedState,
  stickToBottomThreshold: number,
  forceAutoScroll?: boolean | undefined,
) => {
  const clampedOffset = clampThreadViewportScrollOffset(
    scrollOffset,
    derived.maxScrollOffset,
  );

  return getStateIfChanged(state, {
    ...state,
    scrollOffset: clampedOffset,
    autoScroll:
      forceAutoScroll ??
      resolveAutoScroll(
        clampedOffset,
        derived.maxScrollOffset,
        stickToBottomThreshold,
      ),
  });
};

export const createInitialThreadViewportState = ({
  viewportHeight = 0,
  messageHeights = new Map<ThreadMessageKey, number>(),
  messageKeyOrder = [],
  scrollOffset = 0,
  autoScroll = true,
  stickToBottomThreshold = 2,
}: Partial<ThreadViewportState> = {}): ThreadViewportState => ({
  scrollOffset,
  autoScroll,
  viewportHeight,
  messageHeights,
  messageKeyOrder,
  stickToBottomThreshold,
});

export const deriveThreadViewportState = (
  state: ThreadViewportState,
): ThreadViewportDerivedState => {
  let contentHeight = 0;
  const messageOffsets: number[] = [];
  const messageHeightsInOrder = state.messageKeyOrder.map((key) => {
    const height = Math.max(1, state.messageHeights.get(key) ?? 1);
    messageOffsets.push(contentHeight);
    contentHeight += height;
    return height;
  });

  const maxScrollOffset = Math.max(0, contentHeight - state.viewportHeight);
  const viewportBottom = state.scrollOffset + Math.max(0, state.viewportHeight);
  const messageCount = state.messageKeyOrder.length;

  let visibleFirstIndex = messageCount === 0 ? 0 : messageCount - 1;
  let visibleLastIndex = messageCount === 0 ? 0 : messageCount - 1;

  if (messageCount > 0) {
    for (let index = 0; index < messageCount; index++) {
      const top = messageOffsets[index] ?? 0;
      const bottom = top + (messageHeightsInOrder[index] ?? 1);
      if (bottom > state.scrollOffset) {
        visibleFirstIndex = index;
        break;
      }
    }

    for (let index = visibleFirstIndex; index < messageCount; index++) {
      const top = messageOffsets[index] ?? 0;
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
    messageOffsets,
    messageHeightsInOrder,
  };
};

export const threadViewportStateReducer = (
  state: ThreadViewportState,
  action: ThreadViewportReducerAction,
): ThreadViewportState => {
  switch (action.type) {
    case "scrollBy":
      return finalizeAgainstDerived(
        state,
        state.scrollOffset + action.rows,
        action.derived,
        action.stickToBottomThreshold,
        action.rows < 0 ? false : undefined,
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
        action.direction === "up" ? false : undefined,
      );
    case "scrollToTop":
      return finalizeAgainstDerived(
        state,
        0,
        action.derived,
        action.stickToBottomThreshold,
        false,
      );
    case "scrollToBottom":
      return getStateIfChanged(state, {
        ...state,
        scrollOffset: action.derived.maxScrollOffset,
        autoScroll: true,
      });
    case "scrollToMessage": {
      const messageTop = action.derived.messageOffsets[action.index] ?? 0;
      const messageHeight =
        action.derived.messageHeightsInOrder[action.index] ?? 1;
      const nextOffset =
        action.align === "bottom"
          ? messageTop + messageHeight - state.viewportHeight
          : messageTop;

      return finalizeAgainstDerived(
        state,
        nextOffset,
        action.derived,
        action.stickToBottomThreshold,
      );
    }
    case "setAutoScroll":
      return action.enabled
        ? threadViewportStateReducer(state, {
            type: "scrollToBottom",
            derived: action.derived,
            stickToBottomThreshold: action.stickToBottomThreshold,
          })
        : getStateIfChanged(state, { ...state, autoScroll: false });
    default:
      return state;
  }
};

export const buildEffectiveThreadViewportState = (
  externalState: ExternalThreadViewportState,
  internalState: InternalThreadViewportState,
) => {
  const rawState: ThreadViewportState = {
    ...externalState,
    scrollOffset: internalState.scrollOffset,
    autoScroll: internalState.autoScroll,
  };
  const rawDerived = deriveThreadViewportState(rawState);
  const fullState: ThreadViewportState = {
    ...rawState,
    scrollOffset: internalState.autoScroll
      ? rawDerived.maxScrollOffset
      : clampThreadViewportScrollOffset(
          internalState.scrollOffset,
          rawDerived.maxScrollOffset,
        ),
  };

  return {
    fullState,
    derived:
      fullState.scrollOffset === rawState.scrollOffset
        ? rawDerived
        : deriveThreadViewportState(fullState),
  };
};

export type UseThreadViewportStateOptions = {
  viewportHeight: number;
  messageHeights: Map<ThreadMessageKey, number>;
  messageKeyOrder: ThreadMessageKey[];
  stickToBottomThreshold?: number | undefined;
  initialScrollToBottom?: boolean | undefined;
};

export const useThreadViewportState = ({
  viewportHeight,
  messageHeights,
  messageKeyOrder,
  stickToBottomThreshold = 2,
  initialScrollToBottom = true,
}: UseThreadViewportStateOptions) => {
  const [internalState, setInternalState] =
    useState<InternalThreadViewportState>(() => ({
      scrollOffset: 0,
      autoScroll: initialScrollToBottom,
    }));

  const externalState = useMemo<ExternalThreadViewportState>(
    () => ({
      viewportHeight,
      messageHeights,
      messageKeyOrder,
      stickToBottomThreshold,
    }),
    [viewportHeight, messageHeights, messageKeyOrder, stickToBottomThreshold],
  );

  const { fullState, derived } = useMemo(
    () => buildEffectiveThreadViewportState(externalState, internalState),
    [externalState, internalState],
  );

  const latestRef = useRef<ExternalThreadViewportState>(externalState);
  latestRef.current = externalState;

  const dispatchWithDerived = useCallback(
    (action: ThreadViewportDispatchAction) => {
      setInternalState((previous) => {
        const latest = latestRef.current;
        const current = buildEffectiveThreadViewportState(latest, previous);
        const nextState = threadViewportStateReducer(current.fullState, {
          ...action,
          derived: current.derived,
          stickToBottomThreshold: latest.stickToBottomThreshold,
        } as ThreadViewportReducerAction);

        return previous.scrollOffset === nextState.scrollOffset &&
          previous.autoScroll === nextState.autoScroll
          ? previous
          : {
              scrollOffset: nextState.scrollOffset,
              autoScroll: nextState.autoScroll,
            };
      });
    },
    [],
  );

  return {
    state: fullState,
    derived,
    dispatchWithDerived,
  };
};

export const createThreadViewportActions = (
  dispatchWithDerived: Dispatch<ThreadViewportDispatchAction>,
): ThreadViewportStateActions => ({
  scrollBy: (rows) => dispatchWithDerived({ type: "scrollBy", rows }),
  scrollByPage: (direction) =>
    dispatchWithDerived({ type: "scrollByPage", direction }),
  scrollToTop: () => dispatchWithDerived({ type: "scrollToTop" }),
  scrollToBottom: () => dispatchWithDerived({ type: "scrollToBottom" }),
  scrollToMessage: (index, align) =>
    dispatchWithDerived({ type: "scrollToMessage", index, align }),
  setAutoScroll: (enabled) =>
    dispatchWithDerived({ type: "setAutoScroll", enabled }),
});
