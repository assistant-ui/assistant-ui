"use client";

import { composeEventHandlers } from "@radix-ui/primitive";
import { Slot } from "@radix-ui/react-slot";
import { type KeyboardEvent, forwardRef } from "react";
import TextareaAutosize, {
  type TextareaAutosizeProps,
} from "react-textarea-autosize";
import { useAssistantContext } from "../../utils/context/AssistantContext";
import { useComposerContext } from "../../utils/context/ComposerState";
import { useComposerFormContext } from "./ComposerRoot";

type ComposerInputProps = TextareaAutosizeProps & {
  asChild?: boolean;
};

export const ComposerInput = forwardRef<
  HTMLTextAreaElement,
  ComposerInputProps
>(({ asChild, disabled, onChange, onKeyDown, ...rest }, forwardedRef) => {
  const { useThread } = useAssistantContext();
  const isLoading = useThread((t) => t.isLoading);
  const { useComposer } = useComposerContext();
  const value = useComposer((c) => {
    if (!c.isEditing) return "";
    return c.value;
  });

  const Component = asChild ? Slot : TextareaAutosize;

  const composerForm = useComposerFormContext();

  const handleKeyPress = (e: KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "Escape") {
      useComposer.getState().cancel();
    }

    if (isLoading) return;

    if (e.key === "Enter" && e.shiftKey === false) {
      e.preventDefault();
      composerForm.submit();
    }
  };

  return (
    <Component
      value={value}
      {...rest}
      ref={forwardedRef}
      disabled={disabled}
      onChange={composeEventHandlers(onChange, (e) => {
        const composerState = useComposer.getState();
        if (!composerState.isEditing) return;
        return composerState.setValue(e.target.value);
      })}
      onKeyDown={composeEventHandlers(onKeyDown, handleKeyPress)}
    />
  );
});
