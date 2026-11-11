import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { actionBarResumeDisabled } from "../../store/primitive-predicates";

/**
 * @deprecated Use `useThreadResume`. A run that stops before it stores a
 * reply leaves the thread ending with the user's message, which the thread
 * resumes without a branch; a reply that stored content before its run
 * stopped is an ordinary error, answered again with Regenerate. This hook
 * stays enabled only for an empty stale reply a client before v0.3.35 stored,
 * and answers it on a new branch as before.
 */
export const useActionBarResume = () => {
  const aui = useAui();
  const disabled = useAuiState(actionBarResumeDisabled);

  // Resume starts a new branch beside the interrupted reply, the same way Regenerate does; the interrupted reply stays as it is.
  const resume = useCallback(() => {
    aui.message.reload();
  }, [aui]);

  return { resume, disabled };
};
