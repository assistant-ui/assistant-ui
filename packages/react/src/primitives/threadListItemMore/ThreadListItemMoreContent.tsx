"use client";

import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Direction, DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { composeEventHandlers } from "@radix-ui/primitive";
import type { WithRenderPropProps } from "../../utils/Primitive";
import { DropdownMenuRenderContent } from "../dropdownMenuRenderPrimitives";
import { useThreadListItemFocus } from "../threadListFocusGroup";
import { useThreadListItemMoreSetOpen } from "./ThreadListItemMoreRoot";
import { type ScopedProps, useDropdownMenuScope } from "./scope";

export namespace ThreadListItemMorePrimitiveContent {
  export type Element = ComponentRef<typeof DropdownMenuPrimitive.Content>;
  export type Props = WithRenderPropProps<
    typeof DropdownMenuPrimitive.Content
  > & {
    portalProps?:
      | ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Portal>
      | undefined;
  };
}

export const ThreadListItemMorePrimitiveContent = forwardRef<
  ThreadListItemMorePrimitiveContent.Element,
  ThreadListItemMorePrimitiveContent.Props
>(
  (
    {
      __scopeThreadListItemMore,
      portalProps,
      sideOffset = 4,
      ...props
    }: ScopedProps<ThreadListItemMorePrimitiveContent.Props>,
    forwardedRef,
  ) => {
    const scope = useDropdownMenuScope(__scopeThreadListItemMore);
    const setOpen = useThreadListItemMoreSetOpen();
    const focus = useThreadListItemFocus();
    const direction = Direction.useDirection();
    const closeKey = direction === "rtl" ? "ArrowRight" : "ArrowLeft";

    return (
      <DropdownMenuPrimitive.Portal {...scope} {...portalProps}>
        <DropdownMenuRenderContent
          {...scope}
          {...props}
          onKeyDown={composeEventHandlers(props.onKeyDown, (event) => {
            if (event.key !== closeKey) return;
            event.preventDefault();
            setOpen(false);
            focus?.moreRef.current?.focus();
          })}
          onEscapeKeyDown={composeEventHandlers(props.onEscapeKeyDown, () => {
            focus?.moreRef.current?.focus();
          })}
          ref={forwardedRef}
          sideOffset={sideOffset}
        />
      </DropdownMenuPrimitive.Portal>
    );
  },
);

ThreadListItemMorePrimitiveContent.displayName =
  "ThreadListItemMorePrimitive.Content";
