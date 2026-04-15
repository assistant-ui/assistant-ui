"use client";

import { type ComponentRef, forwardRef } from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import {
  type WithRenderPropProps,
  withRenderProp,
} from "../../utils/Primitive";
import { type ScopedProps, useDropdownMenuScope } from "./scope";

const DropdownMenuItem = withRenderProp(DropdownMenuPrimitive.Item);

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

    return <DropdownMenuItem {...scope} {...rest} ref={ref} />;
  },
);

ThreadListItemMorePrimitiveItem.displayName =
  "ThreadListItemMorePrimitive.Item";
