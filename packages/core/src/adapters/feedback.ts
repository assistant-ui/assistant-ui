import type { ThreadMessage } from "../types/message";

type FeedbackAdapterFeedback = {
  message: ThreadMessage;
  type: "positive" | "negative";
};

export type FeedbackAdapter = {
  submit: (feedback: FeedbackAdapterFeedback) => void;
};
