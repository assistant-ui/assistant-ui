"use client";

import { FC } from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { ScopedProps, useDropdownMenuScope } from "./scope";

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
