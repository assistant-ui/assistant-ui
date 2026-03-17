import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useActionBarFeedbackPositive = () => {
  const aui = useAui();
  const isSubmitted = useAuiState(
    (s) => s.message.metadata.submittedFeedback?.type === "positive",
  );

  const submit = useCallback(() => {
    aui.message().submitFeedback({ type: "positive" });
  }, [aui]);

  return { submit, isSubmitted };
};

export const useActionBarFeedbackNegative = () => {
  const aui = useAui();
  const isSubmitted = useAuiState(
    (s) => s.message.metadata.submittedFeedback?.type === "negative",
  );

  const submit = useCallback(() => {
    aui.message().submitFeedback({ type: "negative" });
  }, [aui]);

  return { submit, isSubmitted };
};
