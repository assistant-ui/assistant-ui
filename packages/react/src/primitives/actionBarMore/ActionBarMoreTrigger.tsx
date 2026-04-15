"use client";

import { type ComponentRef, forwardRef } from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import {
  type WithRenderPropProps,
  withRenderProp,
} from "../../utils/Primitive";
import { type ScopedProps, useDropdownMenuScope } from "./scope";

const DropdownMenuTrigger = withRenderProp(DropdownMenuPrimitive.Trigger);

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

    return <DropdownMenuTrigger {...scope} {...rest} ref={ref} />;
  },
);

ActionBarMorePrimitiveTrigger.displayName = "ActionBarMorePrimitive.Trigger";
