"use client";

import { forwardRef, useState, type ComponentPropsWithoutRef } from "react";

type ActionHook = () => (() => void | Promise<void>) | null;

export function createActionButton(displayName: string, useAction: ActionHook) {
  // biome-ignore lint/suspicious: this package supports React 18 and React 19
  const ActionButton = forwardRef<
    HTMLButtonElement,
    ComponentPropsWithoutRef<"button">
  >(({ children, disabled, onClick, ...props }, ref) => {
    const action = useAction();
    const [isPending, setIsPending] = useState(false);

    if (action === null) {
      return null;
    }

    const handleClick: ComponentPropsWithoutRef<"button">["onClick"] = (e) => {
      if (isPending) return;
      onClick?.(e);
      if (e.defaultPrevented) return;

      try {
        const result = action();
        if (result && typeof (result as Promise<void>).then === "function") {
          setIsPending(true);
          void Promise.resolve(result)
            .catch((error) => {
              console.error(`${displayName} action failed:`, error);
            })
            .finally(() => {
              setIsPending(false);
            });
        }
      } catch (error) {
        console.error(`${displayName} action failed:`, error);
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || isPending}
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
