"use client";

import { type FC, useState } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { type ScopedProps, usePopoverScope } from "./scope";
import { useAuiEvent } from "@assistant-ui/store";

export namespace AssistantModalPrimitiveRoot {
  export type Props = PopoverPrimitive.PopoverProps & {
    unstable_openOnRunStart?: boolean | undefined;
  };
}

export const AssistantModalPrimitiveRoot: FC<
  AssistantModalPrimitiveRoot.Props
> = ({
  __scopeAssistantModal,
  defaultOpen = false,
  unstable_openOnRunStart = true,
  open,
  onOpenChange,
  ...rest
}: ScopedProps<AssistantModalPrimitiveRoot.Props>) => {
  const scope = usePopoverScope(__scopeAssistantModal);

  const [modalOpen, setOpen] = useState(defaultOpen);
  const isOpen = open ?? modalOpen;

  const openChangeHandler = (open: boolean) => {
    onOpenChange?.(open);
    setOpen(open);
  };

  useAuiEvent("thread.runStart", () => {
    if (unstable_openOnRunStart && !isOpen) openChangeHandler(true);
  });

  return (
    <PopoverPrimitive.Root
      {...scope}
      open={isOpen}
      onOpenChange={openChangeHandler}
      {...rest}
    />
  );
};

AssistantModalPrimitiveRoot.displayName = "AssistantModalPrimitive.Root";
