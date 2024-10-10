"use client";

import { useActionBarEdit } from "../../primitive-hooks/actionBar/useActionBarEdit";
import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";

/**
 * @deprecated Use `ActionBarPrimitive.Edit.Props` instead. This will be removed in 0.6.
 */
export type ActionBarPrimitiveEditProps = ActionBarPrimitiveEdit.Props;

export namespace ActionBarPrimitiveEdit {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarEdit>;
}

export const ActionBarPrimitiveEdit = createActionButton(
  "ActionBarPrimitive.Edit",
  useActionBarEdit,
);
