"use client";

import { ComponentPropsWithoutRef, ElementRef, forwardRef } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ScopedProps, usePopoverScope } from "./scope";
import { composeEventHandlers } from "@radix-ui/primitive";

/**
 * @deprecated Use `AssistantModalPrimitive.Content.Props` instead. This will be removed in 0.6.
 */
export type AssistantModalPrimitiveContentProps =
  AssistantModalPrimitiveContent.Props;

export namespace AssistantModalPrimitiveContent {
  export type Element = ElementRef<typeof PopoverPrimitive.Content>;
  export type Props = ComponentPropsWithoutRef<
    typeof PopoverPrimitive.Content
  > & {
    dissmissOnInteractOutside?: boolean | undefined;
  };
}

export const AssistantModalPrimitiveContent = forwardRef<
  AssistantModalPrimitiveContent.Element,
  AssistantModalPrimitiveContent.Props
>(
  (
    {
      __scopeAssistantModal,
      side,
      align,
      onInteractOutside,
      dissmissOnInteractOutside = false,
      ...props
    }: ScopedProps<AssistantModalPrimitiveContentProps>,
    forwardedRef,
  ) => {
    const scope = usePopoverScope(__scopeAssistantModal);

    return (
      <PopoverPrimitive.Portal {...scope}>
        <PopoverPrimitive.Content
          {...scope}
          {...props}
          ref={forwardedRef}
          side={side ?? "top"}
          align={align ?? "end"}
          onInteractOutside={composeEventHandlers(
            onInteractOutside,
            dissmissOnInteractOutside ? undefined : (e) => e.preventDefault(),
          )}
        />
      </PopoverPrimitive.Portal>
    );
  },
);

AssistantModalPrimitiveContent.displayName = "AssistantModalPrimitive.Content";
