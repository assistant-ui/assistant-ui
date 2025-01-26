"use client";

import { composeEventHandlers } from "@radix-ui/primitive";
import { Primitive } from "@radix-ui/react-primitive";
import {
  type ComponentRef,
  type FormEvent,
  forwardRef,
  ComponentPropsWithoutRef,
} from "react";
import { useComposerSend } from "./ComposerSend";

export namespace ComposerPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.form>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.form>;
}

export const ComposerPrimitiveRoot = forwardRef<
  ComposerPrimitiveRoot.Element,
  ComposerPrimitiveRoot.Props
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
