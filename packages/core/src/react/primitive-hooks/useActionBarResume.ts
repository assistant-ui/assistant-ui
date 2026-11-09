import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { actionBarResumeDisabled } from "../../store/primitive-predicates";
import { reportRunFailure } from "../../utils/report-run-failure";

export const useActionBarResume = () => {
  const aui = useAui();
  const disabled = useAuiState(actionBarResumeDisabled);

  const resume = useCallback(() => {
    reportRunFailure(
      "Resume",
      aui.thread().startRun({ parentId: aui.message.getState().id }),
    );
  }, [aui]);

  return { resume, disabled };
};
