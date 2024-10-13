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
  useComposerRuntime,
} from "../../context/react/ComposerContext";
import {
  useThread,
  useThreadRuntime,
  useThreadViewportStore,
} from "../../context/react/ThreadContext";
import { useEscapeKeydown } from "@radix-ui/react-use-escape-keydown";
import { useOnComposerFocus } from "../../utils/hooks/useOnComposerFocus";

/**
 * @deprecated Use `ComposerPrimitive.Input.Props` instead. This will be removed in 0.6.
 */
export type ComposerPrimitiveInputProps = ComposerPrimitiveInput.Props;

export namespace ComposerPrimitiveInput {
  export type Element = HTMLTextAreaElement;
  export type Props = TextareaAutosizeProps & {
    asChild?: boolean | undefined;
    submitOnEnter?: boolean | undefined;
    cancelOnEscape?: boolean | undefined;
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
      submitOnEnter = true,
      cancelOnEscape = true,
      ...rest
    },
    forwardedRef,
  ) => {
    const threadRuntime = useThreadRuntime();
    const composerRuntime = useComposerRuntime();
    const threadViewportStore = useThreadViewportStore({ optional: true });

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
      if (composerRuntime.type === "thread") {
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
          if (!composerRuntime.getState().isEditing) return;
          return composerRuntime.setText(e.target.value);
        })}
        onKeyDown={composeEventHandlers(onKeyDown, handleKeyPress)}
      />
    );
  },
);

ComposerPrimitiveInput.displayName = "ComposerPrimitive.Input";
