import { useEffect, useRef, type ComponentProps } from "react";

import { Box, Text, useFocus, useInput } from "ink";
import {
  getGraphemeAt,
  textBufferReducer,
  useTextBuffer,
  type TextBufferState,
} from "./useTextBuffer";

// cap dedup map so an owner that drops echoes can't grow the counter without bound
const PENDING_SYNC_CAP = 64;

export type TextInputProps = ComponentProps<typeof Box> & {
  value: string;
  onChange: (text: string) => void;
  onSubmit?: ((text: string) => void) | undefined;
  submitOnEnter?: boolean | undefined;
  placeholder?: string | undefined;
  autoFocus?: boolean | undefined;
  multiLine?: boolean | undefined;
};

export const TextInput = ({
  value,
  onChange,
  onSubmit,
  submitOnEnter = false,
  placeholder = "",
  autoFocus = true,
  multiLine = false,
  ...boxProps
}: TextInputProps) => {
  const { isFocused } = useFocus({ autoFocus });
  const { text, cursorOffset, preferredColumn, dispatchAction, setText } =
    useTextBuffer(value);
  const bufferStateRef = useRef({ text, cursorOffset, preferredColumn });
  const pendingLocalSyncTextsRef = useRef(new Map<string, number>());
  bufferStateRef.current = { text, cursorOffset, preferredColumn };

  useEffect(() => {
    const counter = pendingLocalSyncTextsRef.current;
    const pending = counter.get(value) ?? 0;
    if (pending > 0) {
      if (pending === 1) counter.delete(value);
      else counter.set(value, pending - 1);
      return;
    }
    if (value === text) return;

    // a mismatched value while echoes are pending is the owner correcting our
    // own edit; keep the cursor at the edit instead of jumping to the end
    const isCorrection = counter.size > 0;
    const previousCursorOffset = bufferStateRef.current.cursorOffset;
    counter.clear();
    setText(value);
    let nextState: TextBufferState = {
      text: value,
      cursorOffset: value.length,
      preferredColumn: undefined,
    };
    if (isCorrection) {
      const restoreCursor = {
        type: "set-cursor",
        cursorOffset: previousCursorOffset,
      } as const;
      dispatchAction(restoreCursor);
      nextState = textBufferReducer(nextState, restoreCursor);
    }
    bufferStateRef.current = nextState;
  }, [setText, value, text, dispatchAction]);

  const commitAction = (
    action: Parameters<typeof textBufferReducer>[1],
    options?: { syncText?: boolean },
  ) => {
    const currentState = bufferStateRef.current;
    // run the reducer eagerly so submit-after-edit sees post-action state before react commits
    const nextState = textBufferReducer(currentState, action);
    dispatchAction(action);
    bufferStateRef.current = nextState;

    if (options?.syncText !== false && nextState.text !== currentState.text) {
      const counter = pendingLocalSyncTextsRef.current;
      if (counter.size >= PENDING_SYNC_CAP) counter.clear();
      counter.set(nextState.text, (counter.get(nextState.text) ?? 0) + 1);
      onChange(nextState.text);
    }
  };

  const submit = () => {
    onSubmit?.(bufferStateRef.current.text);
  };

  useInput(
    (input, key) => {
      const extendedKey = key as typeof key & {
        home?: boolean;
        end?: boolean;
        shift?: boolean;
      };
      const lowerInput = input.toLowerCase();

      if (key.ctrl) {
        // ctrl+j may also report key.return; swallow so single-line never submits
        if (lowerInput === "j") {
          if (multiLine) {
            commitAction({ type: "insert", text: "\n" });
          }
          return;
        }
        if (lowerInput === "a") {
          commitAction({ type: "move-home", multiLine }, { syncText: false });
          return;
        }
        if (lowerInput === "e") {
          commitAction({ type: "move-end", multiLine }, { syncText: false });
          return;
        }
        if (lowerInput === "w") {
          commitAction({ type: "kill-word-backward" });
          return;
        }
        if (lowerInput === "u") {
          commitAction({ type: "kill-start", multiLine });
          return;
        }
        if (lowerInput === "k") {
          commitAction({ type: "kill-end", multiLine });
          return;
        }
        if (lowerInput === "d") {
          commitAction({ type: "delete-forward" });
          return;
        }
      }

      if (key.meta) {
        if (lowerInput === "b") {
          commitAction({ type: "move-word-left" }, { syncText: false });
          return;
        }
        if (lowerInput === "f") {
          commitAction({ type: "move-word-right" }, { syncText: false });
          return;
        }
        if (lowerInput === "d") {
          commitAction({ type: "kill-word-forward" });
          return;
        }
      }

      if (key.return) {
        const shouldInsertNewline =
          multiLine && (!submitOnEnter || extendedKey.shift);
        if (shouldInsertNewline) {
          commitAction({ type: "insert", text: "\n" });
          return;
        }

        if (submitOnEnter) {
          submit();
        }
        return;
      }

      if (key.leftArrow) {
        commitAction({ type: "move-left" }, { syncText: false });
        return;
      }

      if (key.rightArrow) {
        commitAction({ type: "move-right" }, { syncText: false });
        return;
      }

      if (multiLine && key.upArrow) {
        commitAction({ type: "move-up" }, { syncText: false });
        return;
      }

      if (multiLine && key.downArrow) {
        commitAction({ type: "move-down" }, { syncText: false });
        return;
      }

      if (extendedKey.home) {
        commitAction({ type: "move-home", multiLine }, { syncText: false });
        return;
      }

      if (extendedKey.end) {
        commitAction({ type: "move-end", multiLine }, { syncText: false });
        return;
      }

      if (key.backspace) {
        commitAction({ type: "delete-backward" });
        return;
      }

      if (key.delete) {
        commitAction({ type: "delete-forward" });
        return;
      }

      if (input && !key.ctrl && !key.meta) {
        // pasted input can carry newlines that bypass the Enter guard; a single-line field never holds them
        const insertText = multiLine ? input : input.replace(/[\r\n]+/g, "");
        if (insertText) commitAction({ type: "insert", text: insertText });
      }
    },
    { isActive: isFocused },
  );

  const hasText = text.length > 0;
  const isShowingPlaceholder = !hasText && placeholder.length > 0;
  const before = hasText ? text.slice(0, cursorOffset) : "";
  const charAtCursor = hasText ? getGraphemeAt(text, cursorOffset) : "";
  const isOnNewline = charAtCursor === "\n";
  // render a space when on a newline so the inverse cursor cell stays visible
  const atCursor = charAtCursor === "" || isOnNewline ? " " : charAtCursor;
  const after = hasText
    ? isOnNewline
      ? text.slice(cursorOffset)
      : text.slice(cursorOffset + charAtCursor.length)
    : placeholder;

  return (
    <Box {...boxProps}>
      {!isFocused ? (
        <Text dimColor={isShowingPlaceholder}>
          {hasText ? text : placeholder}
        </Text>
      ) : (
        <Text dimColor={isShowingPlaceholder}>
          {before}
          <Text inverse>{atCursor}</Text>
          {after}
        </Text>
      )}
    </Box>
  );
};
