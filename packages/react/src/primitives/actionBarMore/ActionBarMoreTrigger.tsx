"use client";

import { type ComponentRef, forwardRef } from "react";
import type { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import type { WithRenderPropProps } from "../../utils/Primitive";
import { DropdownMenuRenderTrigger } from "../dropdownMenuRenderPrimitives";
import { type ScopedProps, useDropdownMenuScope } from "./scope";

export namespace ActionBarMorePrimitiveTrigger {
  export type Element = ComponentRef<typeof DropdownMenuPrimitive.Trigger>;
  export type Props = WithRenderPropProps<typeof DropdownMenuPrimitive.Trigger>;
}

export const ActionBarMorePrimitiveTrigger = forwardRef<
  ActionBarMorePrimitiveTrigger.Element,
  ActionBarMorePrimitiveTrigger.Props
>(
  (
    {
      __scopeActionBarMore,
      ...rest
    }: ScopedProps<ActionBarMorePrimitiveTrigger.Props>,
    ref,
  ) => {
    const scope = useDropdownMenuScope(__scopeActionBarMore);

    return <DropdownMenuRenderTrigger {...scope} {...rest} ref={ref} />;
  },
);

ActionBarMorePrimitiveTrigger.displayName = "ActionBarMorePrimitive.Trigger";
