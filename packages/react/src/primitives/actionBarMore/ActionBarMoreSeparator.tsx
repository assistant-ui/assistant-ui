"use client";

import { ComponentPropsWithoutRef, ComponentRef, forwardRef } from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { ScopedProps, useDropdownMenuScope } from "./scope";

export namespace ActionBarMorePrimitiveSeparator {
  export type Element = ComponentRef<typeof DropdownMenuPrimitive.Separator>;
  export type Props = ComponentPropsWithoutRef<
    typeof DropdownMenuPrimitive.Separator
  >;
}

export const ActionBarMorePrimitiveSeparator = forwardRef<
  ActionBarMorePrimitiveSeparator.Element,
  ActionBarMorePrimitiveSeparator.Props
>(
  (
    {
      __scopeActionBarMore,
      ...rest
    }: ScopedProps<ActionBarMorePrimitiveSeparator.Props>,
    ref,
  ) => {
    const scope = useDropdownMenuScope(__scopeActionBarMore);

    return <DropdownMenuPrimitive.Separator {...scope} {...rest} ref={ref} />;
  },
);

ActionBarMorePrimitiveSeparator.displayName =
  "ActionBarMorePrimitive.Separator";
