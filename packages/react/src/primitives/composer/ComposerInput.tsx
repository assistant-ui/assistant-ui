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
import {
  useComposer,
  useComposerStore,
} from "../../context/react/ComposerContext";
import { useThread, useThreadStore } from "../../context/react/ThreadContext";
import { useEscapeKeydown } from "@radix-ui/react-use-escape-keydown";
import { useOnComposerFocus } from "../../utils/hooks/useOnComposerFocus";

export type ComposerPrimitiveInputProps = TextareaAutosizeProps & {
  asChild?: boolean | undefined;
};

export const ComposerPrimitiveInput = forwardRef<
  HTMLTextAreaElement,
  ComposerPrimitiveInputProps
>(
  (
    {
      autoFocus = false,
      asChild,
      disabled: disabledProp,
      onChange,
      onKeyDown,
      ...rest
    },
    forwardedRef,
  ) => {
    const threadStore = useThreadStore();
    const composerStore = useComposerStore();

    const value = useComposer((c) => {
      if (!c.isEditing) return "";
      return c.text;
    });

    const Component = asChild ? Slot : TextareaAutosize;

    const isDisabled = useThread((t) => t.isDisabled) ?? disabledProp ?? false;
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const ref = useComposedRefs(forwardedRef, textareaRef);

    useEscapeKeydown((e) => {
      const composer = composerStore.getState();
      if (composer.canCancel) {
        composer.cancel();
        e.preventDefault();
      }
    });

    const handleKeyPress = (e: KeyboardEvent) => {
      if (isDisabled) return;

      // ignore IME composition events
      if (e.nativeEvent.isComposing) return;

      if (e.key === "Enter" && e.shiftKey === false) {
        const { isRunning } = threadStore.getState();

        if (!isRunning) {
          e.preventDefault();

          textareaRef.current?.closest("form")?.requestSubmit();
        }
      }
    };

    const autoFocusEnabled = autoFocus && !isDisabled;
    const focus = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea || !autoFocusEnabled) return;

      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length,
      );
    }, [autoFocusEnabled]);

    useEffect(() => focus(), [focus]);

    useOnComposerFocus(() => {
      if (composerStore.getState().type === "thread") {
        focus();
      }
    });

    return (
      <Component
        name="input"
        value={value}
        {...rest}
        ref={ref}
        disabled={isDisabled}
        onChange={composeEventHandlers(onChange, (e) => {
          const composerState = composerStore.getState();
          if (!composerState.isEditing) return;
          return composerState.setText(e.target.value);
        })}
        onKeyDown={composeEventHandlers(onKeyDown, handleKeyPress)}
      />
    );
  },
);

ComposerPrimitiveInput.displayName = "ComposerPrimitive.Input";
