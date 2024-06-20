"use client";

import { composeEventHandlers } from "@radix-ui/primitive";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { Slot } from "@radix-ui/react-slot";
import {
  type KeyboardEvent,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
} from "react";
import TextareaAutosize, {
  type TextareaAutosizeProps,
} from "react-textarea-autosize";
import { useComposerContext } from "../../context/ComposerContext";
import { useThreadContext } from "../../context/ThreadContext";
import { useOnScrollToBottom } from "../../utils/hooks/useOnScrollToBottom";

type ComposerInputProps = TextareaAutosizeProps & {
  asChild?: boolean;
};

export const ComposerInput = forwardRef<
  HTMLTextAreaElement,
  ComposerInputProps
>(
  (
    { autoFocus = false, asChild, disabled, onChange, onKeyDown, ...rest },
    forwardedRef,
  ) => {
    const { useThread } = useThreadContext();
    const { useComposer, type } = useComposerContext();

    const value = useComposer((c) => {
      if (!c.isEditing) return "";
      return c.value;
    });

    const Component = asChild ? Slot : TextareaAutosize;

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const ref = useComposedRefs(forwardedRef, textareaRef);

    const handleKeyPress = (e: KeyboardEvent) => {
      if (disabled) return;

      if (e.key === "Escape") {
        const composer = useComposer.getState();
        if (composer.cancel()) {
          e.preventDefault();
        }
      } else if (e.key === "Enter" && e.shiftKey === false) {
        const isRunning = useThread.getState().isRunning;
        if (!isRunning) {
          e.preventDefault();

          textareaRef.current?.closest("form")?.requestSubmit();
        }
      }
    };

    const autoFocusEnabled = autoFocus && !disabled;
    const focus = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea || !autoFocusEnabled) return;
      console.log("focus");
      textarea.focus();
      textarea.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length,
      );
    }, [autoFocusEnabled]);

    useEffect(() => focus(), [focus]);

    useOnScrollToBottom(() => {
      if (type === "new") {
        focus();
      }
    });

    return (
      <Component
        value={value}
        {...rest}
        ref={ref}
        autoFocus={autoFocus}
        disabled={disabled}
        onChange={composeEventHandlers(onChange, (e) => {
          const composerState = useComposer.getState();
          if (!composerState.isEditing) return;
          return composerState.setValue(e.target.value);
        })}
        onKeyDown={composeEventHandlers(onKeyDown, handleKeyPress)}
      />
    );
  },
);

ComposerInput.displayName = "ComposerInput";
