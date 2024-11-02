"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useComposerCancel } from "../../primitive-hooks/composer/useComposerCancel";

export namespace ComposerPrimitiveCancel {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useComposerCancel>;
}

export const ComposerPrimitiveCancel = createActionButton(
  "ComposerPrimitive.Cancel",
  useComposerCancel,
);
