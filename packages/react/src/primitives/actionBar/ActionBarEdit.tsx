"use client";

import { useActionBarEdit } from "../../primitive-hooks/actionBar/useActionBarEdit";
import {
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";

export type ActionBarPrimitiveEditProps = ActionButtonProps<
  typeof useActionBarEdit
>;

export const ActionBarPrimitiveEdit = createActionButton(
  "ActionBarPrimitive.Edit",
  useActionBarEdit,
);
