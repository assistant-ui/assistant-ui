import { ComponentPropsWithoutRef, ElementRef, forwardRef } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ScopedProps, usePopoverScope } from "./AssistantModalRoot";

type AssistantModalTriggerElement = ElementRef<typeof PopoverPrimitive.Trigger>;
type AssistantModalTriggerProps = ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Trigger
>;

export const AssistantModalTrigger = forwardRef<
  AssistantModalTriggerElement,
  AssistantModalTriggerProps
>(
  (
    { __scopeAssistantModal, ...rest }: ScopedProps<AssistantModalTriggerProps>,
    ref,
  ) => {
    const scope = usePopoverScope(__scopeAssistantModal);

    return <PopoverPrimitive.Trigger {...scope} {...rest} ref={ref} />;
  },
);
AssistantModalTrigger.displayName = "AssistantModalTrigger";
