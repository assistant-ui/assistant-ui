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
import { useAssistantContext } from "../../utils/context/AssistantContext";
import { useComposerContext } from "../../utils/context/useComposerContext";
import { useOnScrollToBottom } from "../../utils/hooks/useOnScrollToBottom";

type ComposerInputProps = TextareaAutosizeProps & {
  asChild?: boolean;
};

export const ComposerInput = forwardRef<
  HTMLTextAreaElement,
  ComposerInputProps
>(
  (
    { autoFocus, asChild, disabled, onChange, onKeyDown, ...rest },
    forwardedRef,
  ) => {
    const { useThread } = useAssistantContext();
    const { useComposer, type } = useComposerContext();

    const value = useComposer((c) => {
      if (!c.isEditing) return "";
      return c.value;
    });

    const Component = asChild ? Slot : TextareaAutosize;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (disabled) return;

      const composer = useComposer.getState();
      if (e.key === "Escape") {
        if (useComposer.getState().cancel()) {
          e.preventDefault();
        }
      } else if (e.key === "Enter" && e.shiftKey === false) {
        const isRunning = useThread.getState().isRunning;
        if (!isRunning) {
          e.preventDefault();
          composer.send();
        }
      }
    };

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const ref = useComposedRefs(forwardedRef, textareaRef);

    const autoFocusEnabled = autoFocus !== false && !disabled;
    const focus = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea || !autoFocusEnabled) return;

      textarea.focus();
      textarea.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length,
      );
    }, [autoFocusEnabled]);

    useEffect(() => focus(), [focus]);

    useOnScrollToBottom(() => {
      if (type === "assistant") {
        focus();
      }
    });

    return (
      <Component
        value={value}
        {...rest}
        ref={ref}
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
