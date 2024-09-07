"use client";

import {
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useComposerAddAttachment } from "../../primitive-hooks/composer";

export type ComposerPrimitiveAddAttachmentProps = ActionButtonProps<
  typeof useComposerAddAttachment
>;

export const ComposerPrimitiveAddAttachment = createActionButton(
  "ComposerPrimitive.AddAttachment",
  useComposerAddAttachment,
);
