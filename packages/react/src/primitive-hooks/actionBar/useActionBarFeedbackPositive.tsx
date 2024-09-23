import { useCallback } from "react";
import { useThreadRuntime } from "../../context/react/ThreadContext";
import { useMessageStore, useMessageUtilsStore } from "../../context";

export const useActionBarFeedbackPositive = () => {
  const threadRuntime = useThreadRuntime();
  const messageStore = useMessageStore();
  const messageUtilsStore = useMessageUtilsStore();

  const callback = useCallback(() => {
    threadRuntime.submitFeedback({
      messageId: messageStore.getState().message.id,
      type: "positive",
    });
    messageUtilsStore.getState().setSubmittedFeedback("positive");
  }, [messageStore, messageUtilsStore, threadRuntime]);

  return callback;
};
