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

type ComposerPrimitiveRootElement = ElementRef<typeof Primitive.form>;
type PrimitiveFormProps = ComponentPropsWithoutRef<typeof Primitive.form>;

export type ComposerPrimitiveRootProps = PrimitiveFormProps;

export const ComposerPrimitiveRoot = forwardRef<
  ComposerPrimitiveRootElement,
  ComposerPrimitiveRootProps
>(({ onSubmit, ...rest }, forwardedRef) => {
  const send = useComposerSend();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!send) return;
    send();
  };

  return (
    <Primitive.form
      {...rest}
      ref={forwardedRef}
      onSubmit={composeEventHandlers(onSubmit, handleSubmit)}
    />
  );
});

ComposerPrimitiveRoot.displayName = "ComposerPrimitive.Root";
