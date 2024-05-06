"use client";

import { forwardRef } from "react";
import { Primitive, ComponentPropsWithoutRef } from "@radix-ui/react-primitive";
import { composeEventHandlers } from "@radix-ui/primitive";

type ActionButtonCallback = () => {
  disabled?: boolean;
  onClick: () => void;
};

export const createActionButton = (useActionButton: ActionButtonCallback) => {
  type PrimitiveButtonElement = React.ElementRef<typeof Primitive.button>;
  type PrimitiveButtonProps = ComponentPropsWithoutRef<typeof Primitive.button>;

  return forwardRef<PrimitiveButtonElement, PrimitiveButtonProps>(
    (props, forwardedRef) => {
      const { disabled, onClick: callback } = useActionButton();

      return (
        <Primitive.button
          type="button"
          disabled={disabled}
          {...props}
          ref={forwardedRef}
          onClick={composeEventHandlers(props.onClick, () => {
            if (disabled) return;
            callback();
          })}
        />
      );
    },
  );
};
