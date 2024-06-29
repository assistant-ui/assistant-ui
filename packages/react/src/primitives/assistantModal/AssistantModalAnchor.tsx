"use client";
import { ComponentPropsWithoutRef, ElementRef, forwardRef } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ScopedProps, usePopoverScope } from "./scope";

type AssistantModalPrimitiveAnchorElement = ElementRef<
  typeof PopoverPrimitive.Anchor
>;
type AssistantModalPrimitiveAnchorProps = ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Anchor
>;

export const AssistantModalPrimitiveAnchor = forwardRef<
  AssistantModalPrimitiveAnchorElement,
  AssistantModalPrimitiveAnchorProps
>(
  (
    {
      __scopeAssistantModal,
      ...rest
    }: ScopedProps<AssistantModalPrimitiveAnchorProps>,
    ref,
  ) => {
    const scope = usePopoverScope(__scopeAssistantModal);

    return <PopoverPrimitive.Anchor {...scope} {...rest} ref={ref} />;
  },
);
AssistantModalPrimitiveAnchor.displayName = "AssistantModalPrimitive.Anchor";
