import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import type { Context } from "radix-ui/internal";

export const useDropdownMenuScope: ReturnType<
  typeof DropdownMenuPrimitive.createDropdownMenuScope
> = DropdownMenuPrimitive.createDropdownMenuScope();

export type ScopedProps<P> = P & { __scopeActionBarMore?: Context.Scope };
