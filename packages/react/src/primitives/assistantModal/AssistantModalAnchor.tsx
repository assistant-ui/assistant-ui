"use client";
import { ComponentPropsWithoutRef, ElementRef, forwardRef } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ScopedProps, usePopoverScope } from "./scope";

export namespace AssistantModalPrimitiveAnchor {
  export type Element = ElementRef<typeof PopoverPrimitive.Anchor>;
  export type Props = ComponentPropsWithoutRef<typeof PopoverPrimitive.Anchor>;
}

export const AssistantModalPrimitiveAnchor = forwardRef<
  AssistantModalPrimitiveAnchor.Element,
  AssistantModalPrimitiveAnchor.Props
>(
  (
    {
      __scopeAssistantModal,
      ...rest
    }: ScopedProps<AssistantModalPrimitiveAnchor.Props>,
    ref,
  ) => {
    const scope = usePopoverScope(__scopeAssistantModal);

    return <PopoverPrimitive.Anchor {...scope} {...rest} ref={ref} />;
  },
);
AssistantModalPrimitiveAnchor.displayName = "AssistantModalPrimitive.Anchor";
