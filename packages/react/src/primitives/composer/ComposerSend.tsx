"use client";

import { ComponentPropsWithoutRef, ElementRef, forwardRef } from "react";
import { useComposerContext } from "../../context";
import { Primitive } from "@radix-ui/react-primitive";

type ComposerPrimitiveSendElement = ElementRef<typeof Primitive.button>;
type PrimitiveButtonProps = ComponentPropsWithoutRef<typeof Primitive.button>;

export type ComposerPrimitiveSendProps = PrimitiveButtonProps;

export const ComposerPrimitiveSend = forwardRef<
  ComposerPrimitiveSendElement,
  ComposerPrimitiveSendProps
>(({ disabled, ...rest }, ref) => {
  const { useComposer } = useComposerContext();
  const hasValue = useComposer((c) => c.isEditing && c.text.length > 0);

  return (
    <Primitive.button
      type="submit"
      {...rest}
      ref={ref}
      disabled={disabled || !hasValue}
    />
  );
});

ComposerPrimitiveSend.displayName = "ComposerPrimitive.Send";
