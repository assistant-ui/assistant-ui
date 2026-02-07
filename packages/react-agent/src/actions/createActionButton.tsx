"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";

type ActionHook = () => (() => void) | null;

export function createActionButton(displayName: string, useAction: ActionHook) {
  const ActionButton = forwardRef<
    HTMLButtonElement,
    ComponentPropsWithoutRef<"button">
  >(({ children, disabled, onClick, ...props }, ref) => {
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
  });

  ActionButton.displayName = displayName;
  return ActionButton;
}
