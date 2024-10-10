"use client";

import { useAttachmentRemove } from "../../primitive-hooks/attachment/useAttachmentRemove";
import {
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";

export namespace AttachmentPrimitiveRemove {
  export type Props = ActionButtonProps<typeof useAttachmentRemove>;
}

export const AttachmentPrimitiveRemove = createActionButton(
  "AttachmentPrimitive.Remove",
  useAttachmentRemove,
);
