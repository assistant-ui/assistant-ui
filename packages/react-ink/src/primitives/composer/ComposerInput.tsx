import { useEffect, useRef } from "react";
import type { ComponentProps } from "react";
import { Box, Text, useFocus, useInput } from "ink";
import { useAui, useAuiState } from "@assistant-ui/store";
import {
  getGraphemeAt,
  textBufferReducer,
  useTextBuffer,
} from "./useTextBuffer";

// cap dedup map so a store that drops echoes can't grow the counter without bound
const PENDING_SYNC_CAP = 64;

export type ComposerInputProps = ComponentProps<typeof Box> & {
  submitOnEnter?: boolean | undefined;
  placeholder?: string | undefined;
  autoFocus?: boolean | undefined;
  multiLine?: boolean | undefined;
  onSubmit?: ((text: string) => void) | undefined;
};

export const ComposerInput = ({
  submitOnEnter = false,
  placeholder = "",
  autoFocus = true,
  multiLine = false,
  onSubmit,
  ...boxProps
}: ComposerInputProps) => {
  const aui = useAui();
  const storeText = useAuiState((s) => s.composer.text);
  const { isFocused } = useFocus({ autoFocus });
  const auiRef = useRef(aui);
  auiRef.current = aui;
  const { text, cursorOffset, preferredColumn, dispatchAction, setText } =
    useTextBuffer(storeText);
  const bufferStateRef = useRef({ text, cursorOffset, preferredColumn });
  const pendingLocalSyncTextsRef = useRef(new Map<string, number>());
  bufferStateRef.current = { text, cursorOffset, preferredColumn };

  useEffect(() => {
    const counter = pendingLocalSyncTextsRef.current;
    const pending = counter.get(storeText) ?? 0;
    if (pending > 0) {
      if (pending === 1) counter.delete(storeText);
      else counter.set(storeText, pending - 1);
      return;
    }
    if (storeText === text) return;

    counter.clear();
    setText(storeText);
    bufferStateRef.current = {
      text: storeText,
      cursorOffset: storeText.length,
      preferredColumn: undefined,
    };
  }, [setText, storeText, text]);

  const applyAction = (
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
      auiRef.current.composer().setText(nextState.text);
    }
  };

  const submit = () => {
    const submittedText = bufferStateRef.current.text;
    if (onSubmit) {
      onSubmit(submittedText);
      return;
    }

    auiRef.current.composer().send();
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
            applyAction({ type: "insert", text: "\n" });
          }
          return;
        }
        if (lowerInput === "a") {
          applyAction({ type: "move-home", multiLine }, { syncText: false });
          return;
        }
        if (lowerInput === "e") {
          applyAction({ type: "move-end", multiLine }, { syncText: false });
          return;
        }
        if (lowerInput === "w") {
          applyAction({ type: "kill-word-backward" });
          return;
        }
        if (lowerInput === "u") {
          applyAction({ type: "kill-start", multiLine });
          return;
        }
        if (lowerInput === "k") {
          applyAction({ type: "kill-end", multiLine });
          return;
        }
      }

      if (key.meta) {
        if (lowerInput === "b") {
          applyAction({ type: "move-word-left" }, { syncText: false });
          return;
        }
        if (lowerInput === "f") {
          applyAction({ type: "move-word-right" }, { syncText: false });
          return;
        }
        if (lowerInput === "d") {
          applyAction({ type: "kill-word-forward" });
          return;
        }
      }

      if (key.return) {
        const shouldInsertNewline =
          multiLine && (!submitOnEnter || extendedKey.shift);
        if (shouldInsertNewline) {
          applyAction({ type: "insert", text: "\n" });
          return;
        }

        if (submitOnEnter) {
          submit();
        }
        return;
      }

      if (key.leftArrow) {
        applyAction({ type: "move-left" }, { syncText: false });
        return;
      }

      if (key.rightArrow) {
        applyAction({ type: "move-right" }, { syncText: false });
        return;
      }

      if (multiLine && key.upArrow) {
        applyAction({ type: "move-up" }, { syncText: false });
        return;
      }

      if (multiLine && key.downArrow) {
        applyAction({ type: "move-down" }, { syncText: false });
        return;
      }

      if (extendedKey.home) {
        applyAction({ type: "move-home", multiLine }, { syncText: false });
        return;
      }

      if (extendedKey.end) {
        applyAction({ type: "move-end", multiLine }, { syncText: false });
        return;
      }

      if (key.backspace) {
        applyAction({ type: "delete-backward" });
        return;
      }

      if (key.delete) {
        applyAction({ type: "delete-forward" });
        return;
      }

      if (input && !key.ctrl && !key.meta) {
        applyAction({ type: "insert", text: input });
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
