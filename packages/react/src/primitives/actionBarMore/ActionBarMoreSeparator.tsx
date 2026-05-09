"use client";

import { type ComponentRef, forwardRef } from "react";
import type { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import type { WithRenderPropProps } from "../../utils/Primitive";
import { DropdownMenuRenderSeparator } from "../dropdownMenuRenderPrimitives";
import { type ScopedProps, useDropdownMenuScope } from "./scope";

export namespace ActionBarMorePrimitiveSeparator {
  export type Element = ComponentRef<typeof DropdownMenuPrimitive.Separator>;
  export type Props = WithRenderPropProps<
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

    return <DropdownMenuRenderSeparator {...scope} {...rest} ref={ref} />;
  },
);

ActionBarMorePrimitiveSeparator.displayName =
  "ActionBarMorePrimitive.Separator";
