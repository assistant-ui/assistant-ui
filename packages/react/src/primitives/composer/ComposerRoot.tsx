"use client";

import { composeEventHandlers } from "@radix-ui/primitive";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import {
  type ComponentPropsWithoutRef,
  Primitive,
} from "@radix-ui/react-primitive";
import { type FormEvent, forwardRef, useRef } from "react";
import { useComposerContext } from "../../utils/context/useComposerContext";

type ComposerRootElement = React.ElementRef<typeof Primitive.form>;
type PrimitiveFormProps = ComponentPropsWithoutRef<typeof Primitive.form>;

type ComposerRootProps = PrimitiveFormProps;

export const ComposerRoot = forwardRef<ComposerRootElement, ComposerRootProps>(
  ({ onSubmit, ...rest }, forwardedRef) => {
    const { useComposer } = useComposerContext();

    const formRef = useRef<HTMLFormElement>(null);
    const ref = useComposedRefs(forwardedRef, formRef);

    const handleSubmit = (e: FormEvent) => {
      const composerState = useComposer.getState();
      if (!composerState.isEditing) return;

      e.preventDefault();
      composerState.send();
    };

    return (
      <Primitive.form
        {...rest}
        ref={ref}
        onSubmit={composeEventHandlers(onSubmit, handleSubmit)}
      />
    );
  },
);
