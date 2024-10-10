"use client";

import { FC, useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useOnComposerFocus } from "../../utils/hooks/useOnComposerFocus";
import { ScopedProps, usePopoverScope } from "./scope";

/**
 * @deprecated Use `AssistantModalPrimitive.Root.Props` instead. This will be removed in 0.6.
 */
export type AssistantModalPrimitiveRootProps = PopoverPrimitive.PopoverProps;

export namespace AssistantModalPrimitiveRoot {
  export type Props = PopoverPrimitive.PopoverProps;
}

const useAssistantModalOpenState = (defaultOpen = false) => {
  const state = useState(defaultOpen);

  const [, setOpen] = state;
  useOnComposerFocus(() => {
    setOpen(true);
  });

  return state;
};

export const AssistantModalPrimitiveRoot: FC<
  AssistantModalPrimitiveRoot.Props
> = ({
  __scopeAssistantModal,
  defaultOpen,
  open,
  onOpenChange,
  ...rest
}: ScopedProps<AssistantModalPrimitiveRootProps>) => {
  const scope = usePopoverScope(__scopeAssistantModal);

  const [modalOpen, setOpen] = useAssistantModalOpenState(defaultOpen);

  return (
    <PopoverPrimitive.Root
      {...scope}
      open={open === undefined ? modalOpen : open}
      onOpenChange={composeEventHandlers(onOpenChange, setOpen)}
      {...rest}
    />
  );
};

AssistantModalPrimitiveRoot.displayName = "AssistantModalPrimitive.Root";
