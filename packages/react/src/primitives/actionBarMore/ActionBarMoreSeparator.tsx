"use client";

import { type ComponentRef, forwardRef } from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import {
  type WithRenderPropProps,
  withRenderProp,
} from "../../utils/Primitive";
import { type ScopedProps, useDropdownMenuScope } from "./scope";

const DropdownMenuSeparator = withRenderProp(DropdownMenuPrimitive.Separator);

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

    return <DropdownMenuSeparator {...scope} {...rest} ref={ref} />;
  },
);

ActionBarMorePrimitiveSeparator.displayName =
  "ActionBarMorePrimitive.Separator";
