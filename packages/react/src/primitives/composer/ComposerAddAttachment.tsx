"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useComposerAddAttachment } from "../../primitive-hooks/composer";

/**
 * @deprecated Use `ComposerPrimitive.AddAttachment.Props` instead. This will be removed in 0.6.
 */
export type ComposerPrimitiveAddAttachmentProps = ComposerPrimitiveAddAttachment.Props;

export namespace ComposerPrimitiveAddAttachment {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useComposerAddAttachment>;
}

export const ComposerPrimitiveAddAttachment = createActionButton(
  "ComposerPrimitive.AddAttachment",
  useComposerAddAttachment
);
