"use client";

import { useActionBarReload } from "../../primitive-hooks/actionBar/useActionBarReload";
import {
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";

export type ActionBarPrimitiveReloadProps = ActionButtonProps<
  typeof useActionBarReload
>;

export const ActionBarPrimitiveReload = createActionButton(
  "ActionBarPrimitive.Reload",
  useActionBarReload,
);
