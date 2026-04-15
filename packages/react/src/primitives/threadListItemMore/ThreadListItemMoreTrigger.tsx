"use client";

import { type ComponentRef, forwardRef } from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import {
  type WithRenderPropProps,
  withRenderProp,
} from "../../utils/withRenderProp";
import { type ScopedProps, useDropdownMenuScope } from "./scope";

const DropdownMenuTrigger = withRenderProp(DropdownMenuPrimitive.Trigger);

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

    return <DropdownMenuTrigger {...scope} {...rest} ref={ref} />;
  },
);

ThreadListItemMorePrimitiveTrigger.displayName =
  "ThreadListItemMorePrimitive.Trigger";
