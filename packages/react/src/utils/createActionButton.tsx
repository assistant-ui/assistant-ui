"use client";

import { ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { composeEventHandlers } from "@radix-ui/primitive";

type ActionButtonCallback<TProps> = (props: TProps) => null | (() => void);

type PrimitiveButtonElement = ElementRef<typeof Primitive.button>;
type PrimitiveButtonProps = ComponentPropsWithoutRef<typeof Primitive.button>;

export type ActionButtonProps<THook> = PrimitiveButtonProps &
  (THook extends (props: infer TProps) => unknown ? TProps : never);

export const createActionButton = <TProps,>(
  displayName: string,
  useActionButton: ActionButtonCallback<TProps>,
  forwardProps: (keyof NonNullable<TProps>)[] = [],
) => {
  const ActionButton = forwardRef<
    PrimitiveButtonElement,
    PrimitiveButtonProps & TProps
  >((props, forwardedRef) => {
    const forwardedProps = {} as TProps;
    const primitiveProps = {} as PrimitiveButtonProps;

    (Object.keys(props) as Array<keyof typeof props>).forEach((key) => {
      if (forwardProps.includes(key as keyof TProps)) {
        (forwardedProps as any)[key] = props[key];
      } else {
        (primitiveProps as any)[key] = props[key];
      }
    });

    const callback = useActionButton(forwardedProps as TProps);

    return (
      <Primitive.button
        type="button"
        disabled={!callback}
        {...primitiveProps}
        ref={forwardedRef}
        onClick={composeEventHandlers(primitiveProps.onClick, () => {
          callback?.();
        })}
      />
    );
  });

  ActionButton.displayName = displayName;

  return ActionButton;
};
