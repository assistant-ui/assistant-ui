import { useCallback } from "react";
import { useThreadActions } from "../../context/react/ThreadContext";
import { useMessageStore, useMessageUtilsStore } from "../../context";

export const useActionBarFeedbackNegative = () => {
  const threadActions = useThreadActions();
  const messageStore = useMessageStore();
  const messageUtilsStore = useMessageUtilsStore();

  const callback = useCallback(() => {
    threadActions.submitFeedback({
      messageId: messageStore.getState().message.id,
      type: "negative",
    });
    messageUtilsStore.getState().setSubmittedFeedback("negative");
  }, [messageStore, messageUtilsStore, threadActions]);

  return callback;
};
