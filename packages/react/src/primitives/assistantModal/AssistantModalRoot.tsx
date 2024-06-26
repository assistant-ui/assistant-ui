import { FC, useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { Scope } from "@radix-ui/react-context";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useOnComposerFocus } from "../../utils/hooks/useOnComposerFocus";

export type ScopedProps<P> = P & { __scopeAssistantModal?: Scope };
export const usePopoverScope = PopoverPrimitive.createPopoverScope();

type AssistantModalRootProps = PopoverPrimitive.PopoverProps;

const useAssistantModalOpenState = (defaultOpen = false) => {
  const state = useState(defaultOpen);

  const [, setOpen] = state;
  useOnComposerFocus(() => {
    setOpen(true);
  });

  return state;
};

export const AssistantModalRoot: FC<AssistantModalRootProps> = ({
  __scopeAssistantModal,
  defaultOpen,
  open,
  onOpenChange,
  ...rest
}: ScopedProps<AssistantModalRootProps>) => {
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

AssistantModalRoot.displayName = "AssistantModalRoot";
