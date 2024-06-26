"use client";

import { ComponentPropsWithoutRef, ElementRef, forwardRef } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ScopedProps, usePopoverScope } from "./scope";

type AssistantModalPrimitiveTriggerElement = ElementRef<
  typeof PopoverPrimitive.Trigger
>;
export type AssistantModalPrimitiveTriggerProps = ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Trigger
>;

export const AssistantModalPrimitiveTrigger = forwardRef<
  AssistantModalPrimitiveTriggerElement,
  AssistantModalPrimitiveTriggerProps
>(
  (
    {
      __scopeAssistantModal,
      ...rest
    }: ScopedProps<AssistantModalPrimitiveTriggerProps>,
    ref,
  ) => {
    const scope = usePopoverScope(__scopeAssistantModal);

    return <PopoverPrimitive.Trigger {...scope} {...rest} ref={ref} />;
  },
);

AssistantModalPrimitiveTrigger.displayName = "AssistantModalPrimitive.Trigger";
