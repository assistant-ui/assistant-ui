"use client";

import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { type ScopedProps, useDropdownMenuScope } from "./scope";

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
