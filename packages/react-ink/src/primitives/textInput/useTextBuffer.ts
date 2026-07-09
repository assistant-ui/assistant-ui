import { useCallback, useReducer } from "react";

export type TextBufferState = {
  text: string;
  cursorOffset: number;
  preferredColumn: number | undefined;
};

export type TextBufferAction =
  | { type: "insert"; text: string }
  | { type: "delete-backward" }
  | { type: "delete-forward" }
  | { type: "move-left" }
  | { type: "move-right" }
  | { type: "move-up" }
  | { type: "move-down" }
  | { type: "move-home"; multiLine: boolean }
  | { type: "move-end"; multiLine: boolean }
  | { type: "move-word-left" }
  | { type: "move-word-right" }
  | { type: "kill-word-backward" }
  | { type: "kill-word-forward" }
  | { type: "kill-start"; multiLine: boolean }
  | { type: "kill-end"; multiLine: boolean }
  | { type: "set-text"; text: string }
  | { type: "set-cursor"; cursorOffset: number };

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});
const wordSegmenter = new Intl.Segmenter(undefined, { granularity: "word" });

const stepGraphemeLeft = (text: string, offset: number) => {
  if (offset <= 0) return 0;
  let previous = 0;
  for (const { index } of graphemeSegmenter.segment(text)) {
    if (index >= offset) break;
    previous = index;
  }
  return previous;
};

const stepGraphemeRight = (text: string, offset: number) => {
  if (offset >= text.length) return text.length;
  for (const { index, segment } of graphemeSegmenter.segment(text)) {
    const end = index + segment.length;
    if (end > offset) return end;
  }
  return text.length;
};

export const getGraphemeAt = (text: string, offset: number) => {
  if (offset >= text.length) return "";
  for (const { index, segment } of graphemeSegmenter.segment(text)) {
    if (index === offset) return segment;
    if (index > offset) return "";
  }
  return "";
};

const getLineStart = (text: string, cursorOffset: number) => {
  if (cursorOffset === 0) return 0;
  const lineBreakIndex = text.lastIndexOf("\n", cursorOffset - 1);
  return lineBreakIndex === -1 ? 0 : lineBreakIndex + 1;
};

const getLineEnd = (text: string, cursorOffset: number) => {
  const lineBreakIndex = text.indexOf("\n", cursorOffset);
  return lineBreakIndex === -1 ? text.length : lineBreakIndex;
};

const getLineRange = (text: string, cursorOffset: number) => {
  const start = getLineStart(text, cursorOffset);
  const end = getLineEnd(text, cursorOffset);
  return { start, end };
};

const getPreviousWordOffset = (text: string, cursorOffset: number) => {
  let result = 0;
  for (const segment of wordSegmenter.segment(text)) {
    if (segment.index >= cursorOffset) break;
    if (segment.isWordLike) result = segment.index;
  }
  return result;
};

const getNextWordOffset = (text: string, cursorOffset: number) => {
  for (const segment of wordSegmenter.segment(text)) {
    const end = segment.index + segment.segment.length;
    if (end <= cursorOffset) continue;
    if (segment.isWordLike) return end;
  }
  return text.length;
};

const moveVertical = (
  text: string,
  cursorOffset: number,
  preferredColumn: number | undefined,
  direction: -1 | 1,
) => {
  const { start, end } = getLineRange(text, cursorOffset);
  const currentColumn = preferredColumn ?? cursorOffset - start;
  const adjacentBreakIndex = direction === -1 ? start - 1 : end;

  if (adjacentBreakIndex < 0 || adjacentBreakIndex >= text.length) {
    return { cursorOffset, preferredColumn: currentColumn };
  }

  const adjacentCursorBase =
    direction === -1 ? adjacentBreakIndex : adjacentBreakIndex + 1;
  const adjacentRange = getLineRange(text, adjacentCursorBase);
  const nextCursorOffset = clamp(
    adjacentRange.start + currentColumn,
    adjacentRange.start,
    adjacentRange.end,
  );

  return {
    cursorOffset: nextCursorOffset,
    preferredColumn: currentColumn,
  };
};

const clearPreferredColumn = (
  state: TextBufferState,
  cursorOffset: number,
) => ({
  ...state,
  cursorOffset,
  preferredColumn: undefined,
});

export const textBufferReducer = (
  state: TextBufferState,
  action: TextBufferAction,
): TextBufferState => {
  switch (action.type) {
    case "insert": {
      if (!action.text) return state;

      const nextText =
        state.text.slice(0, state.cursorOffset) +
        action.text +
        state.text.slice(state.cursorOffset);
      const nextCursorOffset = state.cursorOffset + action.text.length;
      return clearPreferredColumn(
        { ...state, text: nextText },
        nextCursorOffset,
      );
    }

    case "delete-backward": {
      if (state.cursorOffset === 0) return state;

      const previousOffset = stepGraphemeLeft(state.text, state.cursorOffset);
      const nextText =
        state.text.slice(0, previousOffset) +
        state.text.slice(state.cursorOffset);
      return clearPreferredColumn({ ...state, text: nextText }, previousOffset);
    }

    case "delete-forward": {
      if (state.cursorOffset >= state.text.length) return state;

      const nextOffset = stepGraphemeRight(state.text, state.cursorOffset);
      const nextText =
        state.text.slice(0, state.cursorOffset) + state.text.slice(nextOffset);
      return clearPreferredColumn(
        { ...state, text: nextText },
        state.cursorOffset,
      );
    }

    case "move-left":
      return clearPreferredColumn(
        state,
        stepGraphemeLeft(state.text, state.cursorOffset),
      );

    case "move-right":
      return clearPreferredColumn(
        state,
        stepGraphemeRight(state.text, state.cursorOffset),
      );

    case "move-up": {
      const next = moveVertical(
        state.text,
        state.cursorOffset,
        state.preferredColumn,
        -1,
      );
      return { ...state, ...next };
    }

    case "move-down": {
      const next = moveVertical(
        state.text,
        state.cursorOffset,
        state.preferredColumn,
        1,
      );
      return { ...state, ...next };
    }

    case "move-home": {
      const nextCursorOffset = action.multiLine
        ? getLineStart(state.text, state.cursorOffset)
        : 0;
      return clearPreferredColumn(state, nextCursorOffset);
    }

    case "move-end": {
      const nextCursorOffset = action.multiLine
        ? getLineEnd(state.text, state.cursorOffset)
        : state.text.length;
      return clearPreferredColumn(state, nextCursorOffset);
    }

    case "move-word-left":
      return clearPreferredColumn(
        state,
        getPreviousWordOffset(state.text, state.cursorOffset),
      );

    case "move-word-right":
      return clearPreferredColumn(
        state,
        getNextWordOffset(state.text, state.cursorOffset),
      );

    case "kill-word-backward": {
      const nextCursorOffset = getPreviousWordOffset(
        state.text,
        state.cursorOffset,
      );
      if (nextCursorOffset === state.cursorOffset) return state;

      const nextText =
        state.text.slice(0, nextCursorOffset) +
        state.text.slice(state.cursorOffset);
      return clearPreferredColumn(
        { ...state, text: nextText },
        nextCursorOffset,
      );
    }

    case "kill-word-forward": {
      const nextOffset = getNextWordOffset(state.text, state.cursorOffset);
      if (nextOffset === state.cursorOffset) return state;

      const nextText =
        state.text.slice(0, state.cursorOffset) + state.text.slice(nextOffset);
      return clearPreferredColumn(
        { ...state, text: nextText },
        state.cursorOffset,
      );
    }

    case "kill-start": {
      const rangeStart = action.multiLine
        ? getLineStart(state.text, state.cursorOffset)
        : 0;
      if (rangeStart === state.cursorOffset) return state;

      const nextText =
        state.text.slice(0, rangeStart) + state.text.slice(state.cursorOffset);
      return clearPreferredColumn({ ...state, text: nextText }, rangeStart);
    }

    case "kill-end": {
      const lineEnd = action.multiLine
        ? getLineEnd(state.text, state.cursorOffset)
        : state.text.length;
      // emacs convention: ctrl+k at EOL kills the trailing newline so the next line joins
      const rangeEnd =
        action.multiLine &&
        lineEnd === state.cursorOffset &&
        lineEnd < state.text.length
          ? lineEnd + 1
          : lineEnd;
      if (rangeEnd === state.cursorOffset) return state;

      const nextText =
        state.text.slice(0, state.cursorOffset) + state.text.slice(rangeEnd);
      return clearPreferredColumn(
        { ...state, text: nextText },
        state.cursorOffset,
      );
    }

    case "set-text":
      return {
        text: action.text,
        cursorOffset: action.text.length,
        preferredColumn: undefined,
      };

    case "set-cursor":
      return clearPreferredColumn(
        state,
        clamp(action.cursorOffset, 0, state.text.length),
      );
  }
};

export const createTextBufferState = (text = ""): TextBufferState => ({
  text,
  cursorOffset: text.length,
  preferredColumn: undefined,
});

export const useTextBuffer = (text = "") => {
  const [state, dispatch] = useReducer(
    textBufferReducer,
    createTextBufferState(text),
  );
  const setText = useCallback(
    (nextText: string) => dispatch({ type: "set-text", text: nextText }),
    [],
  );

  return {
    ...state,
    dispatchAction: dispatch,
    setText,
  };
};
