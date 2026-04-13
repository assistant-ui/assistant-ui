"use client";

import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { type ScopedProps, useDropdownMenuScope } from "./scope";

export namespace ThreadListItemMorePrimitiveContent {
  export type Element = ComponentRef<typeof DropdownMenuPrimitive.Content>;
  export type Props = ComponentPropsWithoutRef<
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

    return (
      <DropdownMenuPrimitive.Portal {...scope} {...portalProps}>
        <DropdownMenuPrimitive.Content
          {...scope}
          {...props}
          ref={forwardedRef}
          sideOffset={sideOffset}
        />
      </DropdownMenuPrimitive.Portal>
    );
  },
);

ThreadListItemMorePrimitiveContent.displayName =
  "ThreadListItemMorePrimitive.Content";
