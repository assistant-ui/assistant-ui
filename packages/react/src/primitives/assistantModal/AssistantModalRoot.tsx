"use client";

import { FC, useEffect, useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ScopedProps, usePopoverScope } from "./scope";
import { useAssistantApi } from "../../context";

export namespace AssistantModalPrimitiveRoot {
  export type Props = PopoverPrimitive.PopoverProps & {
    unstable_openOnRunStart?: boolean | undefined;
  };
}

const useAssistantModalOpenState = ({
  defaultOpen = false,
  unstable_openOnRunStart = true,
}: {
  defaultOpen?: boolean | undefined;
  unstable_openOnRunStart?: boolean | undefined;
}) => {
  const state = useState(defaultOpen);

  const [, setOpen] = state;
  const api = useAssistantApi();
  useEffect(() => {
    if (!unstable_openOnRunStart) return undefined;

    return api.on("thread.run-start", () => {
      setOpen(true);
    });
  }, [unstable_openOnRunStart, setOpen, api]);

  return state;
};

export const AssistantModalPrimitiveRoot: FC<
  AssistantModalPrimitiveRoot.Props
> = ({
  __scopeAssistantModal,
  defaultOpen,
  unstable_openOnRunStart,
  open,
  onOpenChange,
  ...rest
}: ScopedProps<AssistantModalPrimitiveRoot.Props>) => {
  const scope = usePopoverScope(__scopeAssistantModal);

  const [modalOpen, setOpen] = useAssistantModalOpenState({
    defaultOpen,
    unstable_openOnRunStart,
  });

  const openChangeHandler = (open: boolean) => {
    onOpenChange?.(open);
    setOpen(open);
  };

  return (
    <PopoverPrimitive.Root
      {...scope}
      open={open === undefined ? modalOpen : open}
      onOpenChange={openChangeHandler}
      {...rest}
    />
  );
};

AssistantModalPrimitiveRoot.displayName = "AssistantModalPrimitive.Root";
