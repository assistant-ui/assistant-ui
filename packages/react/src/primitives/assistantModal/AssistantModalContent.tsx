import { ComponentPropsWithoutRef, ElementRef, forwardRef } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ScopedProps, usePopoverScope } from "./AssistantModalRoot";
import { composeEventHandlers } from "@radix-ui/primitive";

type AssistantModalContentElement = ElementRef<typeof PopoverPrimitive.Content>;
type AssistantModalContentProps = ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Content
> & {
  dissmissOnInteractOutside?: boolean;
};

export const AssistantModalContent = forwardRef<
  AssistantModalContentElement,
  AssistantModalContentProps
>(
  (
    {
      __scopeAssistantModal,
      side,
      align,
      onInteractOutside,
      dissmissOnInteractOutside = false,
      ...props
    }: ScopedProps<AssistantModalContentProps>,
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
AssistantModalContent.displayName = "AssistantModalContent";
