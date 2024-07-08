"use client";
import { ActionBarPrimitive, useThreadContext } from "@assistant-ui/react";
import { forwardRef, type FC } from "react";
import { PencilIcon } from "lucide-react";
import {
  TooltipIconButton,
  TooltipIconButtonProps,
} from "./base/tooltip-icon-button";
import { withDefaults } from "../utils/withDefaults";
import { useThreadConfig } from "./thread-config";

const useAllowEdit = () => {
  const { userMessage: { allowEdit = true } = {} } = useThreadConfig();
  const { useThreadActions } = useThreadContext();
  const editSupported = useThreadActions((t) => t.capabilities.edit);
  return editSupported && allowEdit;
};

export const UserActionBar: FC = () => {
  const allowEdit = useAllowEdit();
  if (!allowEdit) return null;
  return (
    <UserActionBarRoot hideWhenRunning autohide="not-last">
      <UserActionBarEdit />
    </UserActionBarRoot>
  );
};

UserActionBar.displayName = "UserActionBar";

export const UserActionBarRoot = withDefaults(ActionBarPrimitive.Root, {
  className: "aui-user-action-bar-root",
});

UserActionBarRoot.displayName = "UserActionBarRoot";

export const UserActionBarEdit = forwardRef<
  HTMLButtonElement,
  Partial<TooltipIconButtonProps>
>((props, ref) => {
  const {
    strings: { userMessage: { edit: { tooltip = "Edit" } = {} } = {} } = {},
  } = useThreadConfig();
  const allowEdit = useAllowEdit();
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
