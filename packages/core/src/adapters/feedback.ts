import type { ThreadMessage } from "../types";

type FeedbackAdapterFeedback = {
  message: ThreadMessage;
  type: "positive" | "negative";
};

export type FeedbackAdapter = {
  submit: (feedback: FeedbackAdapterFeedback) => void;
};
