"use client";

import { type ComponentPropsWithoutRef, type RefObject } from "react";

type ActionHook = () => (() => void) | null;

export function createActionButton(displayName: string, useAction: ActionHook) {
  const ActionButton = ({
    children,
    disabled,
    onClick,
    ref,
    ...props
  }: ComponentPropsWithoutRef<"button"> & {
    ref?: RefObject<HTMLButtonElement | null>;
  }) => {
    const action = useAction();

    if (action === null) {
      return null;
    }

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      action();
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  };

  ActionButton.displayName = displayName;
  return ActionButton;
}
