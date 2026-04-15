"use client";

import { type ComponentRef, forwardRef } from "react";
import type { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import type { WithRenderPropProps } from "../../utils/Primitive";
import { DropdownMenuRenderItem } from "../dropdownMenuRenderPrimitives";
import { type ScopedProps, useDropdownMenuScope } from "./scope";

export namespace ThreadListItemMorePrimitiveItem {
  export type Element = ComponentRef<typeof DropdownMenuPrimitive.Item>;
  export type Props = WithRenderPropProps<typeof DropdownMenuPrimitive.Item>;
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

    return <DropdownMenuRenderItem {...scope} {...rest} ref={ref} />;
  },
);

ThreadListItemMorePrimitiveItem.displayName =
  "ThreadListItemMorePrimitive.Item";
