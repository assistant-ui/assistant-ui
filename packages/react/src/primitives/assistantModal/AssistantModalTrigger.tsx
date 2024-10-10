"use client";

import { ComponentPropsWithoutRef, ElementRef, forwardRef } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ScopedProps, usePopoverScope } from "./scope";

/**
 * @deprecated Use `AssistantModalPrimitive.Trigger.Props` instead. This will be removed in 0.6.
 */
export type AssistantModalPrimitiveTriggerProps =
  AssistantModalPrimitiveTrigger.Props;

export namespace AssistantModalPrimitiveTrigger {
  export type Element = ElementRef<typeof PopoverPrimitive.Trigger>;
  export type Props = ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>;
}

export const AssistantModalPrimitiveTrigger = forwardRef<
  AssistantModalPrimitiveTrigger.Element,
  AssistantModalPrimitiveTrigger.Props
>(
  (
    {
      __scopeAssistantModal,
      ...rest
    }: ScopedProps<AssistantModalPrimitiveTrigger.Props>,
    ref,
  ) => {
    const scope = usePopoverScope(__scopeAssistantModal);

    return <PopoverPrimitive.Trigger {...scope} {...rest} ref={ref} />;
  },
);

AssistantModalPrimitiveTrigger.displayName = "AssistantModalPrimitive.Trigger";
