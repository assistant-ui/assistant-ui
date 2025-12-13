"use client";

import { FC } from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
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
