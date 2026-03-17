import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useActionBarEdit = () => {
  const aui = useAui();
  const disabled = useAuiState((s) => s.composer.isEditing);

  const edit = useCallback(() => {
    aui.composer().beginEdit();
  }, [aui]);

  return { edit, disabled };
};
