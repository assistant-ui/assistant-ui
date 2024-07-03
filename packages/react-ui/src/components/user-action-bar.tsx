"use client";
import { ActionBarPrimitive } from "@assistant-ui/react";
import { forwardRef, type FC } from "react";
import { PencilIcon } from "lucide-react";
import {
  TooltipIconButton,
  TooltipIconButtonProps,
} from "./base/tooltip-icon-button";
import { styled } from "../styled";
import { useThreadConfig } from "./thread-config";

export const UserActionBar: FC = () => {
  const { userMessage: { allowEdit = true } = {} } = useThreadConfig();
  if (!allowEdit) return null;
  return (
    <UserActionBarRoot hideWhenRunning autohide="not-last">
      <UserActionBarEdit />
    </UserActionBarRoot>
  );
};

UserActionBar.displayName = "UserActionBar";

export const UserActionBarRoot = styled(ActionBarPrimitive.Root, {
  className: "aui-user-action-bar-root",
});

UserActionBarRoot.displayName = "UserActionBarRoot";

export const UserActionBarEdit = forwardRef<
  HTMLButtonElement,
  Partial<TooltipIconButtonProps>
>((props, ref) => {
  const {
    userMessage: { allowEdit = true } = {},
    strings: { userMessage: { edit: { tooltip = "Edit" } = {} } = {} } = {},
  } = useThreadConfig();
  if (!allowEdit) return null;
  return (
    <ActionBarPrimitive.Edit asChild>
      <TooltipIconButton tooltip={tooltip} {...props} ref={ref}>
        <PencilIcon />
      </TooltipIconButton>
    </ActionBarPrimitive.Edit>
  );
});

UserActionBarEdit.displayName = "UserActionBarEdit";
