"use client";

import { type FC, forwardRef } from "react";
import { AssistantModalPrimitive } from "@assistant-ui/react";
import { BotIcon, ChevronDownIcon } from "lucide-react";

import { Thread } from "./thread";
import { styled } from "../styled";
import {
  TooltipIconButton,
  TooltipIconButtonProps,
} from "./base/tooltip-icon-button";
import { useThreadConfig } from "./thread-config";

export const AssistantModal: FC = () => {
  return (
    <AssistantModalPrimitive.Root>
      <AssistantModalTrigger />
      <AssistantModalContent>
        <Thread />
      </AssistantModalContent>
    </AssistantModalPrimitive.Root>
  );
};

AssistantModal.displayName = "AssistantModal";

export const AssistantModalTrigger = forwardRef<
  HTMLButtonElement,
  Partial<TooltipIconButtonProps>
>((props, ref) => {
  return (
    <AssistantModalAnchor>
      <AssistantModalPrimitive.Trigger asChild>
        <AssistantModalButton {...props} ref={ref} />
      </AssistantModalPrimitive.Trigger>
    </AssistantModalAnchor>
  );
});

AssistantModalTrigger.displayName = "AssistantModalTrigger";

const AssistantModalAnchor = styled(AssistantModalPrimitive.Anchor, {
  className: "aui-root aui-assistant-modal-anchor",
});

AssistantModalAnchor.displayName = "AssistantModalAnchor";

const ModalButtonStyled = styled(TooltipIconButton, {
  variant: "default",
  className: "aui-assistant-modal-button",
});

type AssistantModalButtonProps = TooltipIconButtonProps & {
  "data-state"?: "open" | "closed";
};

const AssistantModalButton = forwardRef<
  HTMLButtonElement,
  Partial<AssistantModalButtonProps>
>(({ "data-state": state, ...rest }, ref) => {
  const {
    strings: {
      assistantModal: {
        open: {
          button: { tooltip: openTooltip = "Close Assistant" } = {},
        } = {},
        closed: {
          button: { tooltip: closedTooltip = "Open Assistant" } = {},
        } = {},
      } = {},
    } = {},
  } = useThreadConfig();
  const tooltip = state === "open" ? openTooltip : closedTooltip;

  return (
    <ModalButtonStyled
      side="left"
      tooltip={tooltip}
      data-state={state}
      {...rest}
      ref={ref}
    >
      <BotIcon
        data-state={state}
        className="aui-assistant-modal-button-closed-icon"
      />

      <ChevronDownIcon
        data-state={state}
        className="aui-assistant-modal-button-open-icon"
      />
      <span className="aui-sr-only">{tooltip}</span>
    </ModalButtonStyled>
  );
});

AssistantModalButton.displayName = "AssistantModalButton";

export const AssistantModalContent = styled(AssistantModalPrimitive.Content, {
  className: "aui-root aui-assistant-modal-content",
  sideOffset: 16,
});

AssistantModalContent.displayName = "AssistantModalContent";
