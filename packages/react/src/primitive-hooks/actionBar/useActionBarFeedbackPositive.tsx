import { useCallback } from "react";
import { useMessageRuntime } from "../../context";

export const useActionBarFeedbackPositive = () => {
  const messageRuntime = useMessageRuntime();

  const callback = useCallback(() => {
    messageRuntime.submitFeedback({ type: "positive" });
  }, [messageRuntime]);

  return callback;
};
