"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useCallback } from "react";
import { useAssistantApi } from "../../context";

const useAttachmentRemove = () => {
  const { actions } = useAssistantApi();

  const handleRemoveAttachment = useCallback(() => {
    actions.attachment.remove();
  }, [actions]);

  return handleRemoveAttachment;
};

export namespace AttachmentPrimitiveRemove {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useAttachmentRemove>;
}

export const AttachmentPrimitiveRemove = createActionButton(
  "AttachmentPrimitive.Remove",
  useAttachmentRemove,
);
