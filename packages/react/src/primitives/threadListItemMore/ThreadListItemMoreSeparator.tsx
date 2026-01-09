"use client";

import { ComponentPropsWithoutRef, ComponentRef, forwardRef } from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { ScopedProps, useDropdownMenuScope } from "./scope";

export namespace ThreadListItemMorePrimitiveSeparator {
  export type Element = ComponentRef<typeof DropdownMenuPrimitive.Separator>;
  export type Props = ComponentPropsWithoutRef<
    typeof DropdownMenuPrimitive.Separator
  >;
}

export const ThreadListItemMorePrimitiveSeparator = forwardRef<
  ThreadListItemMorePrimitiveSeparator.Element,
  ThreadListItemMorePrimitiveSeparator.Props
>(
  (
    {
      __scopeThreadListItemMore,
      ...rest
    }: ScopedProps<ThreadListItemMorePrimitiveSeparator.Props>,
    ref,
  ) => {
    const scope = useDropdownMenuScope(__scopeThreadListItemMore);

    return <DropdownMenuPrimitive.Separator {...scope} {...rest} ref={ref} />;
  },
);

ThreadListItemMorePrimitiveSeparator.displayName =
  "ThreadListItemMorePrimitive.Separator";
