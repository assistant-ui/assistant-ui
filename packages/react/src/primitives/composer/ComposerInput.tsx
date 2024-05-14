"use client";

import { type KeyboardEvent, forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { useThreadContext } from "../../utils/context/ThreadContext";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useComposerContext } from "./ComposerRoot";
import TextareaAutosize, { type TextareaAutosizeProps } from "react-textarea-autosize";

type ComposerInputProps = TextareaAutosizeProps & {
  asChild?: boolean;
};

export const ComposerInput = forwardRef<
  HTMLTextAreaElement,
  ComposerInputProps
>(({ asChild, onChange, onKeyDown, ...rest }, forwardedRef) => {
  const chat = useThreadContext(
    "Composer.Input",
    ({ chat: { input, handleInputChange, isLoading } }) => ({
      input,
      handleInputChange,
      isLoading,
    }),
  );

  const Component = asChild ? Slot : TextareaAutosize;

  const composer = useComposerContext();

  const handleKeyPress = (e: KeyboardEvent) => {
    if (chat.isLoading || rest.disabled) return;

    if (e.key === "Enter" && e.shiftKey === false) {
      e.preventDefault();
      composer.submit();
    }
  };

  return (
    <Component
      value={chat.input}
      {...rest}
      ref={forwardedRef}
      onChange={composeEventHandlers(onChange, chat.handleInputChange)}
      onKeyDown={composeEventHandlers(onKeyDown, handleKeyPress)}
    />
  );
});
