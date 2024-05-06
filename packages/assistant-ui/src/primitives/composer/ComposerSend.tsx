"use client";

import { forwardRef } from "react";
import { ComponentPropsWithoutRef, Primitive } from "@radix-ui/react-primitive";
import { useThreadContext } from "../../utils/context/ThreadContext";

type ComposerRootElement = React.ElementRef<typeof Primitive.button>;
type PrimitiveFormProps = ComponentPropsWithoutRef<typeof Primitive.button>;

type ComposerRootProps = PrimitiveFormProps;

export const ComposerSend = forwardRef<ComposerRootElement, ComposerRootProps>(
  ({ disabled, ...rest }, ref) => {
    const input = useThreadContext("Composer.Send", (s) => s.chat.input);

    return (
      <Primitive.button
        type="submit"
        {...rest}
        ref={ref}
        disabled={disabled || input.length === 0}
      />
    );
  },
);
