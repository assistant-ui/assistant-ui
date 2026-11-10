import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { actionBarResumeDisabled } from "../../store/primitive-predicates";

export const useActionBarResume = () => {
  const aui = useAui();
  const disabled = useAuiState(actionBarResumeDisabled);

  // Resume starts a new branch beside the interrupted reply, the same way Regenerate does; the interrupted reply stays as it is.
  const resume = useCallback(() => {
    aui.message.reload();
  }, [aui]);

  return { resume, disabled };
};
