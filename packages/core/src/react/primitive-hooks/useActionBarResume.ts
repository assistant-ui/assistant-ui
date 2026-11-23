import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { actionBarResumeDisabled } from "../../store/primitive-predicates";
import { reportRunFailure } from "../../utils/report-run-failure";

/**
 * @deprecated Use `ThreadPrimitive.Resume`. A run that stops before it
 * stores a reply now leaves the thread ending with the user's message, which
 * the thread resumes; a reply that stored content before its run stopped is
 * an ordinary error, answered again with Regenerate. This hook stays enabled
 * only for an empty stale reply that an earlier client stored, and answers it
 * in place.
 */
export const useActionBarResume = () => {
  const aui = useAui();
  const disabled = useAuiState(actionBarResumeDisabled);

  // Resume answers again in place of an interrupted reply that wrote nothing: it deletes the empty reply, which the history adapter persists, then runs from the reply's parent, so no branch is left beside it.
  const resume = useCallback(() => {
    const thread = aui.thread();
    const { id } = aui.message.getState();
    const messages = thread.getState().messages;
    const index = messages.findIndex((message) => message.id === id);
    const parentId = index > 0 ? messages[index - 1]!.id : null;
    reportRunFailure(
      "Resume",
      (async () => {
        await thread.deleteMessage(id);
        thread.startRun({ parentId });
      })(),
    );
  }, [aui]);

  return { resume, disabled };
};
