import { useCallback } from "react";
import { useThreadRuntime } from "../../context/react/ThreadContext";
import { useMessageStore, useMessageUtilsStore } from "../../context";

export const useActionBarFeedbackNegative = () => {
  const threadRuntime = useThreadRuntime();
  const messageStore = useMessageStore();
  const messageUtilsStore = useMessageUtilsStore();

  const callback = useCallback(() => {
    threadRuntime.submitFeedback({
      messageId: messageStore.getState().message.id,
      type: "negative",
    });
    messageUtilsStore.getState().setSubmittedFeedback("negative");
  }, [messageStore, messageUtilsStore, threadRuntime]);

  return callback;
};
