import { useCallback } from "react";
import { useMessageRuntime, useMessageUtilsStore } from "../../context";

export const useActionBarFeedbackNegative = () => {
  const messageRuntime = useMessageRuntime();
  const messageUtilsStore = useMessageUtilsStore();

  const callback = useCallback(() => {
    messageRuntime.submitFeedback({
      type: "negative",
    });
    messageUtilsStore.getState().setSubmittedFeedback("negative");
  }, [messageUtilsStore, messageRuntime]);

  return callback;
};
