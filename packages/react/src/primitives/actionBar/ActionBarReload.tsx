"use client";

import { useActionBarReload } from "../../primitive-hooks/actionBar/useActionBarReload";
import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";

export namespace ActionBarPrimitiveReload {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarReload>;
}

export const ActionBarPrimitiveReload = createActionButton(
  "ActionBarPrimitive.Reload",
  useActionBarReload,
);
