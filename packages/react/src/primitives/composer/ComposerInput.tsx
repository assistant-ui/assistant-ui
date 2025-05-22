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
  useRef,
} from "react";
import TextareaAutosize, {
  type TextareaAutosizeProps,
} from "react-textarea-autosize";
import {
  useComposer,
  useComposerRuntime,
} from "../../context/react/ComposerContext";
import { useThread, useThreadRuntime } from "../../context/react/ThreadContext";
import { useEscapeKeydown } from "@radix-ui/react-use-escape-keydown";
import { useOnScrollToBottom } from "../../utils/hooks/useOnScrollToBottom";
import { useThreadListItemRuntime } from "../../context/react/ThreadListItemContext";

export namespace ComposerPrimitiveInput {
  export type Element = HTMLTextAreaElement;
  export type Props = TextareaAutosizeProps & {
    asChild?: boolean | undefined;
    submitOnEnter?: boolean | undefined;
    cancelOnEscape?: boolean | undefined;
    unstable_focusOnRunStart?: boolean | undefined;
    unstable_focusOnScrollToBottom?: boolean | undefined;
    unstable_focusOnThreadSwitched?: boolean | undefined;
    addAttachmentOnPaste?: boolean | undefined;
  };
}

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
      submitOnEnter = true,
      cancelOnEscape = true,
      unstable_focusOnRunStart = true,
      unstable_focusOnScrollToBottom = true,
      unstable_focusOnThreadSwitched = true,
      addAttachmentOnPaste = true,
      ...rest
    },
    forwardedRef,
  ) => {
    const threadListItemRuntime = useThreadListItemRuntime();
    const threadRuntime = useThreadRuntime();
    const composerRuntime = useComposerRuntime();

    const value = useComposer((c) => {
      if (!c.isEditing) return "";
      return c.text;
    });

    const Component = asChild ? Slot : TextareaAutosize;

    const isDisabled = useThread((t) => t.isDisabled) ?? disabledProp ?? false;
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const ref = useComposedRefs(forwardedRef, textareaRef);

    useEscapeKeydown((e) => {
      if (!cancelOnEscape) return;

      if (composerRuntime.getState().canCancel) {
        composerRuntime.cancel();
        e.preventDefault();
      }
    });

    const handleKeyPress = (e: KeyboardEvent) => {
      if (isDisabled || !submitOnEnter) return;

      // ignore IME composition events
      if (e.nativeEvent.isComposing) return;

      if (e.key === "Enter" && e.shiftKey === false) {
        const { isRunning } = threadRuntime.getState();

        if (!isRunning) {
          e.preventDefault();

          textareaRef.current?.closest("form")?.requestSubmit();
        }
      }
    };

    const handlePaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
      if (!addAttachmentOnPaste) return;
      const threadCapabilities = threadRuntime.getState().capabilities;
      const files = Array.from(e.clipboardData?.files || []);

      if (threadCapabilities.attachments && files.length > 0) {
        try {
          e.preventDefault();
          await Promise.all(
            files.map((file) => composerRuntime.addAttachment(file)),
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
      if (composerRuntime.type === "thread" && unstable_focusOnScrollToBottom) {
        focus();
      }
    });

    useEffect(() => {
      if (composerRuntime.type !== "thread" || !unstable_focusOnRunStart)
        return undefined;

      return threadRuntime.unstable_on("run-start", focus);
    }, [unstable_focusOnRunStart, focus, composerRuntime, threadRuntime]);

    useEffect(() => {
      if (composerRuntime.type !== "thread" || !unstable_focusOnThreadSwitched)
        return undefined;

      return threadListItemRuntime.unstable_on("switched-to", focus);
    }, [
      unstable_focusOnThreadSwitched,
      focus,
      composerRuntime,
      threadListItemRuntime,
    ]);

    return (
      <Component
        name="input"
        value={value}
        {...rest}
        ref={ref}
        disabled={isDisabled}
        onChange={composeEventHandlers(onChange, (e) => {
          if (!composerRuntime.getState().isEditing) return;
          return composerRuntime.setText(e.target.value);
        })}
        onKeyDown={composeEventHandlers(onKeyDown, handleKeyPress)}
        onPaste={composeEventHandlers(onPaste, handlePaste)}
      />
    );
  },
);

ComposerPrimitiveInput.displayName = "ComposerPrimitive.Input";
