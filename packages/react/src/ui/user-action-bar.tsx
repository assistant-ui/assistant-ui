"use client";

import { forwardRef, type FC } from "react";
import { PencilIcon } from "lucide-react";

import {
  TooltipIconButton,
  TooltipIconButtonProps,
} from "./base/tooltip-icon-button";
import { withDefaults } from "./utils/withDefaults";
import { useThreadConfig } from "./thread-config";
import { useThreadContext } from "../context";
import { ActionBarPrimitive } from "../primitives";

const useAllowEdit = () => {
  const { userMessage: { allowEdit = true } = {} } = useThreadConfig();
  const { useThread } = useThreadContext();
  const editSupported = useThread((t) => t.capabilities.edit);
  return editSupported && allowEdit;
};

const UserActionBar: FC = () => {
  const allowEdit = useAllowEdit();
  if (!allowEdit) return null;
  return (
    <UserActionBarRoot hideWhenRunning autohide="not-last">
      <UserActionBarEdit />
    </UserActionBarRoot>
  );
};

UserActionBar.displayName = "UserActionBar";

const UserActionBarRoot = withDefaults(ActionBarPrimitive.Root, {
  className: "aui-user-action-bar-root",
});

UserActionBarRoot.displayName = "UserActionBarRoot";

const UserActionBarEdit = forwardRef<
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
        {props.children ?? <PencilIcon />}
      </TooltipIconButton>
    </ActionBarPrimitive.Edit>
  );
});

UserActionBarEdit.displayName = "UserActionBarEdit";

const exports = {
  Root: UserActionBarRoot,
  Edit: UserActionBarEdit,
};

export default Object.assign(UserActionBar, exports) as typeof UserActionBar &
  typeof exports;
