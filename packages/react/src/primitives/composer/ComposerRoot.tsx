"use client";

import { composeEventHandlers } from "@radix-ui/primitive";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import {
  type ComponentPropsWithoutRef,
  Primitive,
} from "@radix-ui/react-primitive";
import { type ElementRef, type FormEvent, forwardRef, useRef } from "react";
import { useThreadContext } from "../../context/AssistantContext";
import { useComposerContext } from "../../context/ComposerContext";

type ComposerRootElement = ElementRef<typeof Primitive.form>;
type PrimitiveFormProps = ComponentPropsWithoutRef<typeof Primitive.form>;

type ComposerRootProps = PrimitiveFormProps;

export const ComposerRoot = forwardRef<ComposerRootElement, ComposerRootProps>(
  ({ onSubmit, ...rest }, forwardedRef) => {
    const { useViewport } = useThreadContext();
    const { useComposer } = useComposerContext();

    const formRef = useRef<HTMLFormElement>(null);
    const ref = useComposedRefs(forwardedRef, formRef);

    const handleSubmit = (e: FormEvent) => {
      const composerState = useComposer.getState();
      if (!composerState.isEditing) return;

      e.preventDefault();
      composerState.send();

      useViewport.getState().scrollToBottom();
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
