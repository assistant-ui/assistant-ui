import { useCallback } from "react";
import { useThreadActions } from "../../context/react/ThreadContext";
import { useMessageStore, useMessageUtilsStore } from "../../context";

export const useActionBarFeedbackPositive = () => {
  const threadActions = useThreadActions();
  const messageStore = useMessageStore();
  const messageUtilsStore = useMessageUtilsStore();

  const callback = useCallback(() => {
    threadActions.submitFeedback({
      messageId: messageStore.getState().message.id,
      type: "positive",
    });
    messageUtilsStore.getState().setSubmittedFeedback("positive");
  }, [messageStore, messageUtilsStore, threadActions]);

  return callback;
};
