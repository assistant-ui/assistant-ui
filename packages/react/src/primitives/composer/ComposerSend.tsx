"use client";

import { ComponentPropsWithoutRef, ElementRef, forwardRef } from "react";
import { useComposerContext } from "../../context";
import { Primitive } from "@radix-ui/react-primitive";

type ComposerSendElement = ElementRef<typeof Primitive.button>;
type PrimitiveButtonProps = ComponentPropsWithoutRef<typeof Primitive.button>;

type ComposerSendProps = PrimitiveButtonProps;

export const ComposerSend = forwardRef<ComposerSendElement, ComposerSendProps>(
  ({ disabled, ...rest }, ref) => {
    const { useComposer } = useComposerContext();
    const hasValue = useComposer((c) => c.isEditing && c.value.length > 0);

    return (
      <Primitive.button
        type="submit"
        {...rest}
        ref={ref}
        disabled={disabled || !hasValue}
      />
    );
  },
);

ComposerSend.displayName = "ComposerSend";
