import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { actionBarResumeDisabled } from "../../store/primitive-predicates";
import { discardCloudMessage } from "../runtimes/cloud/runLeases";
import { reportRunFailure } from "../../utils/report-run-failure";

export const useActionBarResume = () => {
  const aui = useAui();
  const disabled = useAuiState(actionBarResumeDisabled);

  // Resume answers again in place of an interrupted reply that wrote nothing: it deletes the empty reply and its stored row, then runs from the reply's parent, so no branch is left beside it. A runtime that cannot delete messages starts a new branch instead, as Regenerate does.
  const resume = useCallback(() => {
    const thread = aui.thread();
    const message = aui.message.getState();
    if (!thread.getState().capabilities.delete) {
      aui.message.reload();
      return;
    }
    const messages = thread.getState().messages;
    const index = messages.findIndex((m) => m.id === message.id);
    const parentId = index > 0 ? messages[index - 1]!.id : null;
    reportRunFailure(
      "Resume",
      (async () => {
        const threadItemId = aui.threadListItem.source
          ? aui.threadListItem.getState().id
          : undefined;
        if (threadItemId !== undefined)
          await discardCloudMessage(threadItemId, message).catch(
            (error: unknown) => {
              console.warn(
                "[assistant-ui] Could not delete the interrupted reply:",
                error,
              );
            },
          );
        await thread.deleteMessage(message.id);
        thread.startRun({ parentId });
      })(),
    );
  }, [aui]);

  return { resume, disabled };
};
