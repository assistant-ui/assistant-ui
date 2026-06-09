"use client";

import { composeEventHandlers } from "@radix-ui/primitive";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { Slot } from "radix-ui";
import {
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  cloneElement,
  isValidElement,
} from "react";
import TextareaAutosize, {
  type TextareaAutosizeProps,
} from "react-textarea-autosize";
import { useEscapeKeydown } from "@radix-ui/react-use-escape-keydown";
import { useOnScrollToBottom } from "../../utils/hooks/useOnScrollToBottom";
import { useMediaQuery } from "../../utils/hooks/useMediaQuery";
import { useAuiState, useAui } from "@assistant-ui/store";
import { flushTapSync } from "@assistant-ui/tap";
import { useComposerInputPluginRegistryOptional } from "./ComposerInputPluginContext";
import { useTriggerPopoverActiveAriaOptional } from "./trigger/TriggerPopoverRootContext";

const TOUCH_PRIMARY_QUERY = "(pointer: coarse) and (not (any-pointer: fine))";

export namespace ComposerPrimitiveInput {
  export type Element = HTMLTextAreaElement;

  type BaseProps = {
    /**
     * Whether to render as a child component using Slot.
     * When true, the component will merge its props with its child.
     */
    asChild?: boolean | undefined;
    /**
     * A React element to use as the input container, with props merged in.
     */
    render?: ReactElement | undefined;
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
     * Whether plain Enter on a touch-primary device should insert a newline
     * instead of submitting, detected via
     * `(pointer: coarse) and (not (any-pointer: fine))`. Only takes effect
     * when `submitMode` resolves to `"enter"`.
     * @default false
     */
    unstable_insertNewlineOnTouchEnter?: boolean | undefined;
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
         * - "none": Keyboard submission disabled
         * @default "enter"
         */
        submitMode?: "enter" | "ctrlEnter" | "none" | undefined;
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
 * When rendered inside `Unstable_TriggerPopoverRoot` and a popover is open, the
 * underlying `<textarea>` automatically receives `aria-controls`,
 * `aria-expanded`, `aria-haspopup`, and `aria-activedescendant` for the
 * combobox relationship. These computed attributes override user-provided
 * values for those four ARIA props while the popover is open.
 *
 * @example
 * ```tsx
 * // Ctrl/Cmd+Enter to submit (plain Enter inserts newline)
 * <ComposerPrimitive.Input
 *   placeholder="Type your message..."
 *   submitMode="ctrlEnter"
 * />
 *
 * // Insert a newline on Enter on touch-primary devices.
 * <ComposerPrimitive.Input
 *   placeholder="Type your message..."
 *   unstable_insertNewlineOnTouchEnter
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
      render,
      disabled: disabledProp,
      onChange,
      onKeyDown,
      onPaste,
      onSelect,
      submitOnEnter,
      submitMode,
      cancelOnEscape = true,
      unstable_focusOnRunStart = true,
      unstable_focusOnScrollToBottom = true,
      unstable_focusOnThreadSwitched = true,
      unstable_insertNewlineOnTouchEnter = false,
      addAttachmentOnPaste = true,
      ...rest
    },
    forwardedRef,
  ) => {
    const aui = useAui();
    const pluginRegistry = useComposerInputPluginRegistryOptional();
    const activeAria = useTriggerPopoverActiveAriaOptional();

    const declaredSubmitMode =
      submitMode ?? (submitOnEnter === false ? "none" : "enter");
    const isTouchPrimary = useMediaQuery(
      unstable_insertNewlineOnTouchEnter ? TOUCH_PRIMARY_QUERY : null,
    );
    const effectiveSubmitMode =
      unstable_insertNewlineOnTouchEnter &&
      isTouchPrimary &&
      declaredSubmitMode === "enter"
        ? "none"
        : declaredSubmitMode;

    const value = useAuiState((s) => {
      if (!s.composer.isEditing) return "";
      return s.composer.text;
    });

    const isDisabled =
      useAuiState(
        (s) => s.thread.isDisabled || s.composer.dictation?.inputDisabled,
      ) || disabledProp;
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const ref = useComposedRefs(forwardedRef, textareaRef);
    // suppress text/cursor broadcasts during IME composition
    const compositionRef = useRef(false);

    useEscapeKeydown((e) => {
      // Only handle ESC if it originated from within this input
      if (!textareaRef.current?.contains(e.target as Node)) return;

      // Let registered plugins (mention, slash command, etc.) handle Escape first
      if (pluginRegistry) {
        for (const plugin of pluginRegistry.getPlugins()) {
          if (plugin.handleKeyDown(e)) return;
        }
      }

      if (!cancelOnEscape) return;

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

      // Let registered plugins (mention, slash command, etc.) handle keyboard events first
      if (pluginRegistry) {
        for (const plugin of pluginRegistry.getPlugins()) {
          if (plugin.handleKeyDown(e)) return;
        }
      }

      if (e.key === "Enter") {
        const threadState = aui.thread().getState();
        const hasQueue = threadState.capabilities.queue;

        // Steer hotkey: Cmd/Ctrl+Shift+Enter (respects submitMode="none" and canSend)
        if (
          e.shiftKey &&
          (e.ctrlKey || e.metaKey) &&
          hasQueue &&
          declaredSubmitMode !== "none" &&
          aui.composer().getState().canSend
        ) {
          e.preventDefault();
          aui.composer().send({ steer: true });
          return;
        }

        // Regular newline: Shift+Enter
        if (e.shiftKey) return;

        // Block submission when running unless queue is supported
        if (threadState.isRunning && !hasQueue) return;

        let shouldSubmit = false;
        if (effectiveSubmitMode === "ctrlEnter") {
          shouldSubmit = e.ctrlKey || e.metaKey;
        } else if (effectiveSubmitMode === "enter") {
          shouldSubmit = true;
        }

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

    const ariaComboboxProps = activeAria
      ? {
          "aria-controls": activeAria.popoverId,
          "aria-expanded": true as const,
          "aria-haspopup": "listbox" as const,
          "aria-activedescendant": activeAria.highlightedItemId,
        }
      : {};

    const inputProps = {
      name: "input" as const,
      value,
      ...rest,
      ...ariaComboboxProps,
      ref: ref as React.ForwardedRef<HTMLTextAreaElement>,
      disabled: isDisabled,
      onChange: composeEventHandlers(
        onChange,
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
          if (!aui.composer().getState().isEditing) return;
          const nativeIsComposing =
            (e.nativeEvent as { isComposing?: boolean }).isComposing === true;
          // recover stuck compositionRef when the browser drops compositionend
          if (compositionRef.current && !nativeIsComposing) {
            compositionRef.current = false;
          }
          const isComposing = nativeIsComposing || compositionRef.current;
          // keep controlled value in sync mid-IME so react does not reset the textarea to a stale value
          flushTapSync(() => {
            aui.composer().setText(e.target.value);
          });
          if (isComposing) return;
          const pos = e.target.selectionStart ?? e.target.value.length;
          if (pluginRegistry) {
            for (const plugin of pluginRegistry.getPlugins()) {
              plugin.setCursorPosition(pos);
            }
          }
        },
      ),
      onKeyDown: composeEventHandlers(onKeyDown, handleKeyPress),
      onCompositionStart: composeEventHandlers(
        (rest as { onCompositionStart?: React.CompositionEventHandler })
          .onCompositionStart,
        () => {
          compositionRef.current = true;
        },
      ),
      onCompositionEnd: composeEventHandlers(
        (rest as { onCompositionEnd?: React.CompositionEventHandler })
          .onCompositionEnd,
        (e: React.CompositionEvent<HTMLTextAreaElement>) => {
          compositionRef.current = false;
          if (!aui.composer().getState().isEditing) return;
          const target = e.target as HTMLTextAreaElement;
          flushTapSync(() => {
            aui.composer().setText(target.value);
          });
          const pos = target.selectionStart ?? target.value.length;
          if (pluginRegistry) {
            for (const plugin of pluginRegistry.getPlugins()) {
              plugin.setCursorPosition(pos);
            }
          }
        },
      ),
      onSelect: composeEventHandlers(
        onSelect,
        (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
          if (compositionRef.current) return;
          const target = e.target as HTMLTextAreaElement;
          const pos = target.selectionStart ?? target.value.length;
          if (pluginRegistry) {
            for (const plugin of pluginRegistry.getPlugins()) {
              plugin.setCursorPosition(pos);
            }
          }
        },
      ),
      onPaste: composeEventHandlers(onPaste, handlePaste),
    };

    if (render && isValidElement(render)) {
      const renderChildren =
        (rest as any).children !== undefined
          ? ((rest as any).children as ReactNode)
          : ((render.props as Record<string, unknown>).children as ReactNode);
      return (
        <Slot.Root {...inputProps}>
          {cloneElement(render, undefined, renderChildren)}
        </Slot.Root>
      );
    }

    const Component = asChild ? Slot.Root : TextareaAutosize;
    return <Component {...inputProps} />;
  },
);

ComposerPrimitiveInput.displayName = "ComposerPrimitive.Input";
