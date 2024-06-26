import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { Scope } from "@radix-ui/react-context";

export type ScopedProps<P> = P & { __scopeAssistantModal?: Scope };
export const usePopoverScope = PopoverPrimitive.createPopoverScope();
