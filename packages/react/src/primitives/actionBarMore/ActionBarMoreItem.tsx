"use client";

import { type ComponentRef, forwardRef } from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import {
  type WithRenderPropProps,
  withRenderProp,
} from "../../utils/Primitive";
import { type ScopedProps, useDropdownMenuScope } from "./scope";

const DropdownMenuItem = withRenderProp(DropdownMenuPrimitive.Item);

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

    return <DropdownMenuItem {...scope} {...rest} ref={ref} />;
  },
);

ActionBarMorePrimitiveItem.displayName = "ActionBarMorePrimitive.Item";
