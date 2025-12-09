"use client";

import { ComponentPropsWithoutRef, ComponentRef, forwardRef } from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { ScopedProps, useDropdownMenuScope } from "./scope";

export namespace ThreadListItemMorePrimitiveTrigger {
  export type Element = ComponentRef<typeof DropdownMenuPrimitive.Trigger>;
  export type Props = ComponentPropsWithoutRef<
    typeof DropdownMenuPrimitive.Trigger
  >;
}

export const ThreadListItemMorePrimitiveTrigger = forwardRef<
  ThreadListItemMorePrimitiveTrigger.Element,
  ThreadListItemMorePrimitiveTrigger.Props
>(
  (
    {
      __scopeThreadListItemMore,
      ...rest
    }: ScopedProps<ThreadListItemMorePrimitiveTrigger.Props>,
    ref,
  ) => {
    const scope = useDropdownMenuScope(__scopeThreadListItemMore);

    return <DropdownMenuPrimitive.Trigger {...scope} {...rest} ref={ref} />;
  },
);

ThreadListItemMorePrimitiveTrigger.displayName =
  "ThreadListItemMorePrimitive.Trigger";
