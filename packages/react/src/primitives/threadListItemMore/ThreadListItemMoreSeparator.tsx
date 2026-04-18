"use client";

import { type ComponentRef, forwardRef } from "react";
import type { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import type { WithRenderPropProps } from "../../utils/Primitive";
import { DropdownMenuRenderSeparator } from "../dropdownMenuRenderPrimitives";
import { type ScopedProps, useDropdownMenuScope } from "./scope";

export namespace ThreadListItemMorePrimitiveSeparator {
  export type Element = ComponentRef<typeof DropdownMenuPrimitive.Separator>;
  export type Props = WithRenderPropProps<
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

    return <DropdownMenuRenderSeparator {...scope} {...rest} ref={ref} />;
  },
);

ThreadListItemMorePrimitiveSeparator.displayName =
  "ThreadListItemMorePrimitive.Separator";
