import { Popover as PopoverPrimitive } from "radix-ui";
import type { Context } from "radix-ui/internal";

export const usePopoverScope: ReturnType<
  typeof PopoverPrimitive.createPopoverScope
> = PopoverPrimitive.createPopoverScope();
export type ScopedProps<P> = P & { __scopeAssistantModal?: Context.Scope };
