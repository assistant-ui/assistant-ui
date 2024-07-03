"use client";

import { ActionBarPrimitive, MessagePrimitive } from "@assistant-ui/react";
import { forwardRef, type FC } from "react";
import { CheckIcon, CopyIcon, RefreshCwIcon } from "lucide-react";
import {
  TooltipIconButton,
  TooltipIconButtonProps,
} from "./base/tooltip-icon-button";
import { styled } from "../styled";
import { useThreadConfig } from "./thread-config";

export const AssistantActionBar: FC = () => {
  const { assistantMessage: { allowCopy = true, allowReload = true } = {} } =
    useThreadConfig();
  if (!allowCopy && !allowReload) return null;
  return (
    <AssistantActionBarRoot
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
    >
      <AssistantActionBarCopy />
      <AssistantActionBarReload />
    </AssistantActionBarRoot>
  );
};

AssistantActionBar.displayName = "AssistantActionBar";

export const AssistantActionBarRoot = styled(ActionBarPrimitive.Root, {
  className: "aui-assistant-action-bar-root",
});

AssistantActionBarRoot.displayName = "AssistantActionBarRoot";

export const AssistantActionBarCopy = forwardRef<
  HTMLButtonElement,
  Partial<TooltipIconButtonProps>
>((props, ref) => {
  const {
    assistantMessage: { allowCopy = true } = {},
    strings: {
      assistantMessage: { reload: { tooltip = "Copy" } = {} } = {},
    } = {},
  } = useThreadConfig();
  if (!allowCopy) return null;
  return (
    <ActionBarPrimitive.Copy asChild>
      <TooltipIconButton tooltip={tooltip} {...props} ref={ref}>
        <MessagePrimitive.If copied>
          <CheckIcon />
        </MessagePrimitive.If>
        <MessagePrimitive.If copied={false}>
          <CopyIcon />
        </MessagePrimitive.If>
      </TooltipIconButton>
    </ActionBarPrimitive.Copy>
  );
});

AssistantActionBarCopy.displayName = "AssistantActionBarCopy";

export const AssistantActionBarReload = forwardRef<
  HTMLButtonElement,
  Partial<TooltipIconButtonProps>
>((props, ref) => {
  const {
    assistantMessage: { allowReload = true } = {},
    strings: {
      assistantMessage: { reload: { tooltip = "Refresh" } = {} } = {},
    } = {},
  } = useThreadConfig();
  if (!allowReload) return null;
  return (
    <ActionBarPrimitive.Reload asChild>
      <TooltipIconButton tooltip={tooltip} {...props} ref={ref}>
        <RefreshCwIcon />
      </TooltipIconButton>
    </ActionBarPrimitive.Reload>
  );
});

AssistantActionBarReload.displayName = "AssistantActionBarReload";
