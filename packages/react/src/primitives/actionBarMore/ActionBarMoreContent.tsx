"use client";

import { ComponentPropsWithoutRef, ComponentRef, forwardRef } from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { ScopedProps, useDropdownMenuScope } from "./scope";

export namespace ActionBarMorePrimitiveContent {
  export type Element = ComponentRef<typeof DropdownMenuPrimitive.Content>;
  export type Props = ComponentPropsWithoutRef<
    typeof DropdownMenuPrimitive.Content
  > & {
    portalProps?:
      | ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Portal>
      | undefined;
  };
}

export const ActionBarMorePrimitiveContent = forwardRef<
  ActionBarMorePrimitiveContent.Element,
  ActionBarMorePrimitiveContent.Props
>(
  (
    {
      __scopeActionBarMore,
      portalProps,
      sideOffset = 4,
      ...props
    }: ScopedProps<ActionBarMorePrimitiveContent.Props>,
    forwardedRef,
  ) => {
    const scope = useDropdownMenuScope(__scopeActionBarMore);

    return (
      <DropdownMenuPrimitive.Portal {...scope} {...portalProps}>
        <DropdownMenuPrimitive.Content
          {...scope}
          {...props}
          ref={forwardedRef}
          sideOffset={sideOffset}
        />
      </DropdownMenuPrimitive.Portal>
    );
  },
);

ActionBarMorePrimitiveContent.displayName = "ActionBarMorePrimitive.Content";
