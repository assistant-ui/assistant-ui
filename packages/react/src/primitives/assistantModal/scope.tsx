import * as PopoverPrimitive from "@radix-ui/react-popover";

export const usePopoverScope = PopoverPrimitive.createPopoverScope();
export type ScopedProps<P> = P & {
  __scopeAssistantModal?: Parameters<typeof usePopoverScope>[0];
};
