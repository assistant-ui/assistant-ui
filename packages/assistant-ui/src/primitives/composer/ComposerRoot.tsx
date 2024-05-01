"use client";

import { forwardRef } from "react";
import { ComponentPropsWithoutRef, Primitive } from "@radix-ui/react-primitive";
import { useThreadContext } from "../../utils/context/Context";
import { composeEventHandlers } from "@radix-ui/primitive";

type ComposerRootElement = React.ElementRef<typeof Primitive.form>;
type PrimitiveFormProps = ComponentPropsWithoutRef<typeof Primitive.form>;

type ComposerRootProps = PrimitiveFormProps;

export const ComposerRoot = forwardRef<ComposerRootElement, ComposerRootProps>(
  ({ onSubmit, ...rest }, ref) => {
    const chat = useThreadContext();
    return (
      <Primitive.form
        {...rest}
        ref={ref}
        onSubmit={composeEventHandlers(onSubmit, chat.handleSubmit)}
      />
    );
  },
);
