"use client";

import { composeEventHandlers } from "@radix-ui/primitive";
import {
  type ComponentPropsWithoutRef,
  Primitive,
} from "@radix-ui/react-primitive";
import { forwardRef } from "react";
import { useComposerContext } from "../../utils/context/useComposerContext";

type ComposerCancelElement = React.ElementRef<typeof Primitive.button>;
type PrimitiveFormProps = ComponentPropsWithoutRef<typeof Primitive.button>;

type ComposerCancelProps = PrimitiveFormProps;

export const ComposerCancel = forwardRef<
  ComposerCancelElement,
  ComposerCancelProps
>(({ disabled, onClick, ...rest }, ref) => {
  const { useComposer } = useComposerContext();
  const hasValue = useComposer((c) => c.canCancel);

  const handleClose = () => {
    useComposer.getState().cancel();
  };

  return (
    <Primitive.button
      type="button"
      {...rest}
      ref={ref}
      onClick={composeEventHandlers(onClick, handleClose)}
      disabled={disabled || !hasValue}
    />
  );
});
