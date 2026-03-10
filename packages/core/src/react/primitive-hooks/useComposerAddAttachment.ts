import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type { CreateAttachment } from "../../types/attachment";

export const useComposerAddAttachment = () => {
  const aui = useAui();
  const disabled = useAuiState((s) => !s.composer.isEditing);

  const addAttachment = useCallback(
    (file: File | CreateAttachment) => {
      return aui.composer().addAttachment(file);
    },
    [aui],
  );

  return { addAttachment, disabled };
};
