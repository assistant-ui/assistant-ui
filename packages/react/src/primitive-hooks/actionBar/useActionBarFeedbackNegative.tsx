"use client";

import { useCallback } from "react";
import { useMessageRuntime } from "../../context";

export const useActionBarFeedbackNegative = () => {
  const messageRuntime = useMessageRuntime();

  const callback = useCallback(() => {
    messageRuntime.submitFeedback({ type: "negative" });
  }, [messageRuntime]);

  return callback;
};
