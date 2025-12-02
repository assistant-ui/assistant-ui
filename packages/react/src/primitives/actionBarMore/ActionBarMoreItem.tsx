"use client";

import { ComponentPropsWithoutRef, ComponentRef, forwardRef } from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { ScopedProps, useDropdownMenuScope } from "./scope";

export namespace ActionBarMorePrimitiveItem {
  export type Element = ComponentRef<typeof DropdownMenuPrimitive.Item>;
  export type Props = ComponentPropsWithoutRef<
    typeof DropdownMenuPrimitive.Item
  >;
}

export const ActionBarMorePrimitiveItem = forwardRef<
  ActionBarMorePrimitiveItem.Element,
  ActionBarMorePrimitiveItem.Props
>(
  (
    {
      __scopeActionBarMore,
      ...rest
    }: ScopedProps<ActionBarMorePrimitiveItem.Props>,
    ref,
  ) => {
    const scope = useDropdownMenuScope(__scopeActionBarMore);

    return <DropdownMenuPrimitive.Item {...scope} {...rest} ref={ref} />;
  },
);

ActionBarMorePrimitiveItem.displayName = "ActionBarMorePrimitive.Item";
