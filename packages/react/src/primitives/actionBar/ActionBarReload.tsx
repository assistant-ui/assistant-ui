"use client";

import { useActionBarReload } from "../../primitive-hooks/actionBar/useActionBarReload";
import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";

/**
 * @deprecated Use `ActionBarPrimitive.Reload.Props` instead. This will be removed in 0.6.
 */
export type ActionBarPrimitiveReloadProps = ActionBarPrimitiveReload.Props;

export namespace ActionBarPrimitiveReload {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarReload>;
}

export const ActionBarPrimitiveReload = createActionButton(
  "ActionBarPrimitive.Reload",
  useActionBarReload,
);
