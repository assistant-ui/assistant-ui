import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { threadResumeDisabled } from "../../store/primitive-predicates";
import { reportRunFailure } from "../../utils/report-run-failure";
import { useThreadReplyState } from "./useThreadReplyState";

/**
 * Answers the thread's last message, the user's, whose run was interrupted
 * before it stored a reply. It runs from that message, so the reply is its
 * first answer and no branch is left beside it.
 */
export const useThreadResume = () => {
  const aui = useAui();
  const replyState = useThreadReplyState();
  const disabled =
    useAuiState(threadResumeDisabled) || replyState !== "interrupted";

  const resume = useCallback(() => {
    const thread = aui.thread();
    const head = thread.getState().messages.at(-1);
    if (head?.role !== "user") return;
    reportRunFailure("Resume", thread.startRun({ parentId: head.id }));
  }, [aui]);

  return { resume, disabled };
};
