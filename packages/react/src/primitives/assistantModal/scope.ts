import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { Scope } from "@radix-ui/react-context";

export const usePopoverScope: ReturnType<
  typeof PopoverPrimitive.createPopoverScope
> = PopoverPrimitive.createPopoverScope();
export type ScopedProps<P> = P & { __scopeAssistantModal?: Scope };
