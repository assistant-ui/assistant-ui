"use client";

import { FC } from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { ScopedProps, useDropdownMenuScope } from "./scope";

export namespace ActionBarMorePrimitiveRoot {
  export type Props = DropdownMenuPrimitive.DropdownMenuProps;
}

export const ActionBarMorePrimitiveRoot: FC<
  ActionBarMorePrimitiveRoot.Props
> = ({
  __scopeActionBarMore,
  ...rest
}: ScopedProps<ActionBarMorePrimitiveRoot.Props>) => {
  const scope = useDropdownMenuScope(__scopeActionBarMore);

  return <DropdownMenuPrimitive.Root {...scope} {...rest} />;
};

ActionBarMorePrimitiveRoot.displayName = "ActionBarMorePrimitive.Root";
