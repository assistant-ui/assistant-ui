"use client";

import { ComponentPropsWithoutRef, ComponentRef, forwardRef } from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { ScopedProps, useDropdownMenuScope } from "./scope";

export namespace ThreadListItemMorePrimitiveItem {
  export type Element = ComponentRef<typeof DropdownMenuPrimitive.Item>;
  export type Props = ComponentPropsWithoutRef<
    typeof DropdownMenuPrimitive.Item
  >;
}

export const ThreadListItemMorePrimitiveItem = forwardRef<
  ThreadListItemMorePrimitiveItem.Element,
  ThreadListItemMorePrimitiveItem.Props
>(
  (
    {
      __scopeThreadListItemMore,
      ...rest
    }: ScopedProps<ThreadListItemMorePrimitiveItem.Props>,
    ref,
  ) => {
    const scope = useDropdownMenuScope(__scopeThreadListItemMore);

    return <DropdownMenuPrimitive.Item {...scope} {...rest} ref={ref} />;
  },
);

ThreadListItemMorePrimitiveItem.displayName =
  "ThreadListItemMorePrimitive.Item";
