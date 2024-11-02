"use client";

import { useActionBarEdit } from "../../primitive-hooks/actionBar/useActionBarEdit";
import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";

export namespace ActionBarPrimitiveEdit {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarEdit>;
}

export const ActionBarPrimitiveEdit = createActionButton(
  "ActionBarPrimitive.Edit",
  useActionBarEdit,
);
