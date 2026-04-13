"use client";

import type { FC } from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { type ScopedProps, useDropdownMenuScope } from "./scope";

export namespace ThreadListItemMorePrimitiveRoot {
  export type Props = DropdownMenuPrimitive.DropdownMenuProps;
}

export const ThreadListItemMorePrimitiveRoot: FC<
  ThreadListItemMorePrimitiveRoot.Props
> = ({
  __scopeThreadListItemMore,
  ...rest
}: ScopedProps<ThreadListItemMorePrimitiveRoot.Props>) => {
  const scope = useDropdownMenuScope(__scopeThreadListItemMore);

  return <DropdownMenuPrimitive.Root {...scope} {...rest} />;
};

ThreadListItemMorePrimitiveRoot.displayName =
  "ThreadListItemMorePrimitive.Root";
