import { useCallback } from "react";
import { useMessageRuntime, useMessageUtilsStore } from "../../context";

export const useActionBarFeedbackPositive = () => {
  const messageRuntime = useMessageRuntime();
  const messageUtilsStore = useMessageUtilsStore();

  const callback = useCallback(() => {
    messageRuntime.submitFeedback({
      type: "positive",
    });
    messageUtilsStore.getState().setSubmittedFeedback("positive");
  }, [messageUtilsStore, messageRuntime]);

  return callback;
};
