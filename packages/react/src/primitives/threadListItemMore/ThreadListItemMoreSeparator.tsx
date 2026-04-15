"use client";

import { type ComponentRef, forwardRef } from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import {
  type WithRenderPropProps,
  withRenderProp,
} from "../../utils/Primitive";
import { type ScopedProps, useDropdownMenuScope } from "./scope";

const DropdownMenuSeparator = withRenderProp(DropdownMenuPrimitive.Separator);

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

    return <DropdownMenuSeparator {...scope} {...rest} ref={ref} />;
  },
);

ThreadListItemMorePrimitiveSeparator.displayName =
  "ThreadListItemMorePrimitive.Separator";
