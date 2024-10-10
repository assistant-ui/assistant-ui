"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useComposerCancel } from "../../primitive-hooks/composer/useComposerCancel";

/**
 * @deprecated Use `ComposerPrimitive.Cancel.Props` instead. This will be removed in 0.6.
 */
export type ComposerPrimitiveCancelProps = ComposerPrimitiveCancel.Props;

export namespace ComposerPrimitiveCancel {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useComposerCancel>;
}

export const ComposerPrimitiveCancel = createActionButton(
  "ComposerPrimitive.Cancel",
  useComposerCancel,
);
