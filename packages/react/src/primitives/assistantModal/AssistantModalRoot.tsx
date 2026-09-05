"use client";

import { type FC, useEffect, useState } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { type ScopedProps, usePopoverScope } from "./scope";
import { useAui } from "@assistant-ui/store";

export namespace AssistantModalPrimitiveRoot {
  export type Props = PopoverPrimitive.PopoverProps & {
    /**
     * @deprecated Experimental since 2024-10-12, extended 2026-12-05. Not scheduled for removal; the API may change in any release.
     */
    unstable_openOnRunStart?: boolean | undefined;
  };
}

const useAssistantModalOpenState = ({
  defaultOpen = false,
  unstable_openOnRunStart = true,
}: {
  defaultOpen?: boolean | undefined;
  /**
   * @deprecated Experimental since 2024-10-12, extended 2026-12-05. Not scheduled for removal; the API may change in any release.
   */
  unstable_openOnRunStart?: boolean | undefined;
}) => {
  const state = useState(defaultOpen);

  const [, setOpen] = state;
  const aui = useAui();
  useEffect(() => {
    if (!unstable_openOnRunStart) return undefined;

    return aui.on("thread.runStart", () => {
      setOpen(true);
    });
  }, [unstable_openOnRunStart, aui, setOpen]);

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
