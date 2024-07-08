"use client";

import {
  ActionBarPrimitive,
  MessagePrimitive,
  useThreadContext,
} from "@assistant-ui/react";
import { forwardRef, type FC } from "react";
import { CheckIcon, CopyIcon, RefreshCwIcon } from "lucide-react";
import {
  TooltipIconButton,
  TooltipIconButtonProps,
} from "./base/tooltip-icon-button";
import { withDefaults } from "../utils/withDefaults";
import { useThreadConfig } from "./thread-config";

const useAllowCopy = () => {
  const { assistantMessage: { allowCopy = true } = {} } = useThreadConfig();
  const { useThreadActions } = useThreadContext();
  const copySupported = useThreadActions((t) => t.capabilities.copy);
  return copySupported && allowCopy;
};

const useAllowReload = () => {
  const { assistantMessage: { allowReload = true } = {} } = useThreadConfig();
  const { useThreadActions } = useThreadContext();
  const reloadSupported = useThreadActions((t) => t.capabilities.reload);
  return reloadSupported && allowReload;
};

export const AssistantActionBar: FC = () => {
  const allowCopy = useAllowCopy();
  const allowReload = useAllowReload();
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

export const AssistantActionBarRoot = withDefaults(ActionBarPrimitive.Root, {
  className: "aui-assistant-action-bar-root",
});

AssistantActionBarRoot.displayName = "AssistantActionBarRoot";

export const AssistantActionBarCopy = forwardRef<
  HTMLButtonElement,
  Partial<TooltipIconButtonProps>
>((props, ref) => {
  const {
    strings: {
      assistantMessage: { reload: { tooltip = "Copy" } = {} } = {},
    } = {},
  } = useThreadConfig();
  const allowCopy = useAllowCopy();
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
    strings: {
      assistantMessage: { reload: { tooltip = "Refresh" } = {} } = {},
    } = {},
  } = useThreadConfig();
  const allowReload = useAllowReload();
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
