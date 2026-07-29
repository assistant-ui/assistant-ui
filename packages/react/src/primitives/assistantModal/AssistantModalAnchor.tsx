"use client";

import { type ComponentRef, forwardRef } from "react";
import type { Popover as PopoverPrimitive } from "radix-ui";
import type { WithRenderPropProps } from "../../utils/Primitive";
import { PopoverRenderAnchor } from "./popoverRenderPrimitives";
import { type ScopedProps, usePopoverScope } from "./scope";

export namespace AssistantModalPrimitiveAnchor {
  export type Element = ComponentRef<typeof PopoverPrimitive.Anchor>;
  export type Props = WithRenderPropProps<typeof PopoverPrimitive.Anchor>;
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

    return <PopoverRenderAnchor {...scope} {...rest} ref={ref} />;
  },
);
AssistantModalPrimitiveAnchor.displayName = "AssistantModalPrimitive.Anchor";
