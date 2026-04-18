"use client";

import { type ComponentRef, forwardRef } from "react";
import type { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import type { WithRenderPropProps } from "../../utils/Primitive";
import { DropdownMenuRenderTrigger } from "../dropdownMenuRenderPrimitives";
import { type ScopedProps, useDropdownMenuScope } from "./scope";

export namespace ThreadListItemMorePrimitiveTrigger {
  export type Element = ComponentRef<typeof DropdownMenuPrimitive.Trigger>;
  export type Props = WithRenderPropProps<typeof DropdownMenuPrimitive.Trigger>;
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

    return <DropdownMenuRenderTrigger {...scope} {...rest} ref={ref} />;
  },
);

ThreadListItemMorePrimitiveTrigger.displayName =
  "ThreadListItemMorePrimitive.Trigger";
