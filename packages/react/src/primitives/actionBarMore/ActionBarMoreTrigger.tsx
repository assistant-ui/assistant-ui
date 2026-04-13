"use client";

import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { type ScopedProps, useDropdownMenuScope } from "./scope";

export namespace ActionBarMorePrimitiveTrigger {
  export type Element = ComponentRef<typeof DropdownMenuPrimitive.Trigger>;
  export type Props = ComponentPropsWithoutRef<
    typeof DropdownMenuPrimitive.Trigger
  >;
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

    return <DropdownMenuPrimitive.Trigger {...scope} {...rest} ref={ref} />;
  },
);

ActionBarMorePrimitiveTrigger.displayName = "ActionBarMorePrimitive.Trigger";
