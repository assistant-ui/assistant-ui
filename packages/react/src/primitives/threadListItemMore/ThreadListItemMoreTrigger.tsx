"use client";

import { type ComponentRef, forwardRef } from "react";
import {
  Direction,
  type DropdownMenu as DropdownMenuPrimitive,
} from "radix-ui";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { composeEventHandlers } from "@radix-ui/primitive";
import type { WithRenderPropProps } from "../../utils/Primitive";
import { DropdownMenuRenderTrigger } from "../dropdownMenuRenderPrimitives";
import { useThreadListItemFocus } from "../threadListFocusGroup";
import { useThreadListItemMoreSetOpen } from "./ThreadListItemMoreRoot";
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
    const focus = useThreadListItemFocus();
    const setOpen = useThreadListItemMoreSetOpen();
    const composedRef = useComposedRefs(ref, focus?.moreRef);
    const direction = Direction.useDirection();
    const openKey = direction === "rtl" ? "ArrowLeft" : "ArrowRight";

    return (
      <DropdownMenuRenderTrigger
        {...scope}
        {...rest}
        onKeyDown={composeEventHandlers(rest.onKeyDown, (event) => {
          if (event.key !== openKey) return;
          event.preventDefault();
          setOpen(true);
        })}
        ref={composedRef}
      />
    );
  },
);

ThreadListItemMorePrimitiveTrigger.displayName =
  "ThreadListItemMorePrimitive.Trigger";
