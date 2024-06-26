"use client";

import {
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useComposerCancel } from "../../primitive-hooks/composer/useComposerCancel";

export type ComposerPrimitiveCancelProps = ActionButtonProps<
  typeof useComposerCancel
>;

export const ComposerPrimitiveCancel = createActionButton(
  "ComposerPrimitive.Cancel",
  useComposerCancel,
);
