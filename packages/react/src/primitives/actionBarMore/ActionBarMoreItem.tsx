"use client";

import { type ComponentRef, forwardRef } from "react";
import type { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import type { WithRenderPropProps } from "../../utils/Primitive";
import { DropdownMenuRenderItem } from "../dropdownMenuRenderPrimitives";
import { type ScopedProps, useDropdownMenuScope } from "./scope";

export namespace ActionBarMorePrimitiveItem {
  export type Element = ComponentRef<typeof DropdownMenuPrimitive.Item>;
  export type Props = WithRenderPropProps<typeof DropdownMenuPrimitive.Item>;
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

    return <DropdownMenuRenderItem {...scope} {...rest} ref={ref} />;
  },
);

ActionBarMorePrimitiveItem.displayName = "ActionBarMorePrimitive.Item";
