"use client";

import { composeEventHandlers } from "@radix-ui/primitive";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { Slot } from "@radix-ui/react-slot";
import {
  ClipboardEvent,
  type KeyboardEvent,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import TextareaAutosize, {
  type TextareaAutosizeProps,
} from "react-textarea-autosize";
import { useEscapeKeydown } from "@radix-ui/react-use-escape-keydown";
import { useOnScrollToBottom } from "../../utils/hooks/useOnScrollToBottom";
import { useAuiState, useAui } from "@assistant-ui/store";
import { flushResourcesSync } from "@assistant-ui/tap";

export namespace ComposerPrimitiveInput {
  export type Element = HTMLTextAreaElement;

  type BaseProps = {
    /**
     * Whether to render as a child component using Slot.
     * When true, the component will merge its props with its child.
     */
    asChild?: boolean | undefined;
    /**
     * Whether to cancel message composition when Escape is pressed.
     * @default true
     */
    cancelOnEscape?: boolean | undefined;
    /**
     * Whether to automatically focus the input when a new run starts.
     * @default true
     */
    unstable_focusOnRunStart?: boolean | undefined;
    /**
     * Whether to automatically focus the input when scrolling to bottom.
     * @default true
     */
    unstable_focusOnScrollToBottom?: boolean | undefined;
    /**
     * Whether to automatically focus the input when switching threads.
     * @default true
     */
    unstable_focusOnThreadSwitched?: boolean | undefined;
    /**
     * Whether to automatically add pasted files as attachments.
     * @default true
     */
    addAttachmentOnPaste?: boolean | undefined;
  };

  type SubmitModeProps =
    | {
        /**
         * Controls how the Enter key submits messages.
         * - "enter": Plain Enter submits (Shift+Enter for newline)
         * - "ctrlEnter": Ctrl/Cmd+Enter submits (plain Enter for newline)
         * @default "enter"
         */
        submitMode?: "enter" | "ctrlEnter" | undefined;
        /**
         * @deprecated Use `submitMode` instead
         * @ignore
         */
        submitOnEnter?: never;
      }
    | {
        submitMode?: never;
        /**
         * Whether to submit the message when Enter is pressed (without Shift).
         * @default true
         * @deprecated Use `submitMode` instead. Will be removed in a future version.
         */
        submitOnEnter?: boolean | undefined;
      };

  export type Props = TextareaAutosizeProps & BaseProps & SubmitModeProps;
}

/**
 * A text input component for composing messages.
 *
 * This component provides a rich text input experience with automatic resizing,
 * keyboard shortcuts, file paste support, and intelligent focus management.
 * It integrates with the composer context to manage message state and submission.
 *
 * @example
 * ```tsx
 * // New API (recommended)
 * <ComposerPrimitive.Input
 *   placeholder="Type your message..."
 *   submitMode="enter"
 *   addAttachmentOnPaste={true}
 * />
 *
 * // Old API (deprecated, still supported)
 * <ComposerPrimitive.Input
 *   placeholder="Type your message..."
 *   submitOnEnter={true}
 * />
 * ```
 */
export const ComposerPrimitiveInput = forwardRef<
  ComposerPrimitiveInput.Element,
  ComposerPrimitiveInput.Props
>(
  (
    {
      autoFocus = false,
      asChild,
      disabled: disabledProp,
      onChange,
      onKeyDown,
      onPaste,
      submitOnEnter,
      submitMode,
      cancelOnEscape = true,
      unstable_focusOnRunStart = true,
      unstable_focusOnScrollToBottom = true,
      unstable_focusOnThreadSwitched = true,
      addAttachmentOnPaste = true,
      ...rest
    },
    forwardedRef,
  ) => {
    const aui = useAui();

    const effectiveSubmitMode = useMemo(
      () => submitMode ?? (submitOnEnter === false ? "none" : "enter"),
      [submitMode, submitOnEnter],
    );

    useEffect(() => {
      if (process.env["NODE_ENV"] === "production") return;
      if (submitMode === undefined || submitOnEnter === undefined) return;

      console.warn(
        "ComposerInput: Both submitMode and submitOnEnter (deprecated) are provided. submitMode takes precedence. Use submitMode only.",
      );
    }, [submitMode, submitOnEnter]);

    const value = useAuiState((s) => {
      if (!s.composer.isEditing) return "";
      return s.composer.text;
    });

    const Component = asChild ? Slot : TextareaAutosize;

    const isDisabled =
      useAuiState(
        (s) => s.thread.isDisabled || s.composer.dictation?.inputDisabled,
      ) || disabledProp;
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const ref = useComposedRefs(forwardedRef, textareaRef);

    useEscapeKeydown((e) => {
      if (!cancelOnEscape) return;

      // Only handle ESC if it originated from within this input
      if (!textareaRef.current?.contains(e.target as Node)) return;

      const composer = aui.composer();
      if (composer.getState().canCancel) {
        composer.cancel();
        e.preventDefault();
      }
    });

    const handleKeyPress = (e: KeyboardEvent) => {
      if (isDisabled) return;

      // ignore IME composition events
      if (e.nativeEvent.isComposing) return;

      const isRunning = aui.thread().getState().isRunning;
      if (isRunning) return;

      if (e.key === "Enter") {
        // Check if shift is pressed - always newline
        if (e.shiftKey) return;

        let shouldSubmit = false;
        if (effectiveSubmitMode === "ctrlEnter") {
          // ctrlEnter mode: only submit with Ctrl/Cmd+Enter
          shouldSubmit = e.ctrlKey || e.metaKey;
        } else if (effectiveSubmitMode === "enter") {
          // enter mode: submit on Enter (original behavior)
          shouldSubmit = true;
        }
        // effectiveSubmitMode === "none": never submit

        if (shouldSubmit) {
          e.preventDefault();
          textareaRef.current?.closest("form")?.requestSubmit();
        }
      }
    };

    const handlePaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
      if (!addAttachmentOnPaste) return;
      const threadCapabilities = aui.thread().getState().capabilities;
      const files = Array.from(e.clipboardData?.files || []);

      if (threadCapabilities.attachments && files.length > 0) {
        try {
          e.preventDefault();
          await Promise.all(
            files.map((file) => aui.composer().addAttachment(file)),
          );
        } catch (error) {
          console.error("Error adding attachment:", error);
        }
      }
    };

    const autoFocusEnabled = autoFocus && !isDisabled;
    const focus = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea || !autoFocusEnabled) return;

      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }, [autoFocusEnabled]);

    useEffect(() => focus(), [focus]);

    useOnScrollToBottom(() => {
      if (
        aui.composer().getState().type === "thread" &&
        unstable_focusOnScrollToBottom
      ) {
        focus();
      }
    });

    useEffect(() => {
      if (
        aui.composer().getState().type !== "thread" ||
        !unstable_focusOnRunStart
      )
        return undefined;

      return aui.on("thread.runStart", focus);
    }, [unstable_focusOnRunStart, focus, aui]);

    useEffect(() => {
      if (
        aui.composer().getState().type !== "thread" ||
        !unstable_focusOnThreadSwitched
      )
        return undefined;

      return aui.on("threadListItem.switchedTo", focus);
    }, [unstable_focusOnThreadSwitched, focus, aui]);

    return (
      <Component
        name="input"
        value={value}
        {...rest}
        ref={ref as React.ForwardedRef<HTMLTextAreaElement>}
        disabled={isDisabled}
        onChange={composeEventHandlers(onChange, (e) => {
          if (!aui.composer().getState().isEditing) return;
          flushResourcesSync(() => {
            aui.composer().setText(e.target.value);
          });
        })}
        onKeyDown={composeEventHandlers(onKeyDown, handleKeyPress)}
        onPaste={composeEventHandlers(onPaste, handlePaste)}
      />
    );
  },
);

ComposerPrimitiveInput.displayName = "ComposerPrimitive.Input";
