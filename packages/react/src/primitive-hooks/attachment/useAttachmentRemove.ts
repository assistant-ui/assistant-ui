import { useCallback } from "react";
import { useAttachmentRuntime } from "../../context/react/AttachmentContext";

export const useAttachmentRemove = () => {
  const attachmentRuntime = useAttachmentRuntime();

  const handleRemoveAttachment = useCallback(() => {
    attachmentRuntime.remove();
  }, [attachmentRuntime]);

  return handleRemoveAttachment;
};
