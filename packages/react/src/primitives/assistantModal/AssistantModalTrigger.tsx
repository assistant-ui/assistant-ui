import { type ComponentRef, forwardRef } from "react";
import type { Popover as PopoverPrimitive } from "radix-ui";
import type { WithRenderPropProps } from "../../utils/Primitive";
import { PopoverRenderTrigger } from "./popoverRenderPrimitives";
import { type ScopedProps, usePopoverScope } from "./scope";

export namespace AssistantModalPrimitiveTrigger {
  export type Element = ComponentRef<typeof PopoverPrimitive.Trigger>;
  export type Props = WithRenderPropProps<typeof PopoverPrimitive.Trigger>;
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

    return <PopoverRenderTrigger {...scope} {...rest} ref={ref} />;
  },
);

AssistantModalPrimitiveTrigger.displayName = "AssistantModalPrimitive.Trigger";
