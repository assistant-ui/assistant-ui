"use client";

import { KeyboardEvent, forwardRef } from "react";
import { ComponentPropsWithoutRef } from "@radix-ui/react-primitive";
import { Slot } from "@radix-ui/react-slot";
import { useThreadContext } from "../../utils/context/Context";
import { composeEventHandlers } from "@radix-ui/primitive";

type ComposerInputProps = ComponentPropsWithoutRef<"textarea"> & {
  asChild?: boolean;
};

export const ComposerInput = forwardRef<
  HTMLTextAreaElement,
  ComposerInputProps
>(({ asChild, onChange, onKeyDown, ...rest }, ref) => {
  const chat = useThreadContext();

  const Component = asChild ? Slot : "textarea";

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.keyCode == 13 && e.shiftKey == false) {
      e.preventDefault();
      // TODO submit form
      // buttonRef.current?.click();
    }
  };

  return (
    <Component
      value={chat.input}
      {...rest}
      ref={ref}
      onChange={composeEventHandlers(onChange, chat.handleInputChange)}
      onKeyDown={composeEventHandlers(onKeyDown, handleKeyPress)}
    />
  );
});
