import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { composerResumeDisabled } from "../../store/primitive-predicates";
import { reportRunFailure } from "../../utils/report-run-failure";

export const useComposerResume = () => {
  const aui = useAui();
  const disabled = useAuiState(composerResumeDisabled);

  const resume = useCallback(() => {
    reportRunFailure(
      "Resume",
      aui.thread().resumeRun({
        parentId: aui.thread().getState().messages.at(-1)?.id ?? null,
      }),
    );
  }, [aui]);

  return { resume, disabled };
};
