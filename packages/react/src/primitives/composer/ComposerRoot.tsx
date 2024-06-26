"use client";

import { composeEventHandlers } from "@radix-ui/primitive";
import { Primitive } from "@radix-ui/react-primitive";
import {
  type ElementRef,
  type FormEvent,
  forwardRef,
  ComponentPropsWithoutRef,
} from "react";
import { useComposerSend } from "../../primitive-hooks";

type ComposerRootElement = ElementRef<typeof Primitive.form>;
type PrimitiveFormProps = ComponentPropsWithoutRef<typeof Primitive.form>;

type ComposerRootProps = PrimitiveFormProps;

export const ComposerRoot = forwardRef<ComposerRootElement, ComposerRootProps>(
  ({ onSubmit, ...rest }, forwardedRef) => {
    const send = useComposerSend();

    const handleSubmit = (e: FormEvent) => {
      if (!send) return;

      e.preventDefault();
      send();
    };

    return (
      <Primitive.form
        {...rest}
        ref={forwardedRef}
        onSubmit={composeEventHandlers(onSubmit, handleSubmit)}
      />
    );
  },
);

ComposerRoot.displayName = "ComposerRoot";
