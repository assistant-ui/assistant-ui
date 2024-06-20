"use client";

import { composeEventHandlers } from "@radix-ui/primitive";
import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";

type ActionButtonCallback<TProps> = (props: TProps) => null | (() => void);

export const createActionButton = <TProps,>(
  useActionButton: ActionButtonCallback<TProps>,
) => {
  type PrimitiveButtonElement = ElementRef<typeof Primitive.button>;
  type PrimitiveButtonProps = ComponentPropsWithoutRef<typeof Primitive.button>;

  const ActionButton = forwardRef<
    PrimitiveButtonElement,
    PrimitiveButtonProps & TProps
  >((props, forwardedRef) => {
    const onClick = useActionButton(props);

    return (
      <Primitive.button
        type="button"
        disabled={!onClick}
        {...props}
        ref={forwardedRef}
        onClick={composeEventHandlers(props.onClick, onClick ?? undefined)}
      />
    );
  });

  ActionButton.displayName = "ActionButton";

  return ActionButton;
};
