import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { Scope } from "@radix-ui/react-context";

export const useDropdownMenuScope: ReturnType<
  typeof DropdownMenuPrimitive.createDropdownMenuScope
> = DropdownMenuPrimitive.createDropdownMenuScope();

export type ScopedProps<P> = P & { __scopeThreadListItemMore?: Scope };
