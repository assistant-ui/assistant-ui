"use client";

import { FC, useCallback, useEffect, useRef } from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { ScopedProps, useDropdownMenuScope } from "./scope";
import { useActionBarInteractionContext } from "../actionBar/ActionBarInteractionContext";

export namespace ActionBarMorePrimitiveRoot {
  export type Props = DropdownMenuPrimitive.DropdownMenuProps;
}

export const ActionBarMorePrimitiveRoot: FC<
  ActionBarMorePrimitiveRoot.Props
> = ({
  __scopeActionBarMore,
  open,
  onOpenChange,
  ...rest
}: ScopedProps<ActionBarMorePrimitiveRoot.Props>) => {
  const scope = useDropdownMenuScope(__scopeActionBarMore);
  const actionBarInteraction = useActionBarInteractionContext();
  const releaseInteractionLockRef = useRef<(() => void) | null>(null);
  const isControlled = open !== undefined;

  const setInteractionOpen = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        if (releaseInteractionLockRef.current) return;
        releaseInteractionLockRef.current =
          actionBarInteraction?.acquireInteractionLock() ?? null;
        return;
      }

      releaseInteractionLockRef.current?.();
      releaseInteractionLockRef.current = null;
    },
    [actionBarInteraction],
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setInteractionOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, setInteractionOpen, onOpenChange],
  );

  useEffect(() => {
    if (!isControlled) return;
    setInteractionOpen(Boolean(open));
  }, [isControlled, open, setInteractionOpen]);

  useEffect(() => {
    return () => {
      releaseInteractionLockRef.current?.();
      releaseInteractionLockRef.current = null;
    };
  }, []);

  return (
    <DropdownMenuPrimitive.Root
      {...scope}
      {...rest}
      {...(open !== undefined ? { open } : null)}
      onOpenChange={handleOpenChange}
    />
  );
};

ActionBarMorePrimitiveRoot.displayName = "ActionBarMorePrimitive.Root";
