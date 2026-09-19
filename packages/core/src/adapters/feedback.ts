import type { ThreadMessage } from "../types/message";

type FeedbackAdapterFeedback = {
  message: ThreadMessage;
  type: "positive" | "negative";
  comment?: string;
};

export type FeedbackAdapter = {
  submit: (feedback: FeedbackAdapterFeedback) => void;
};
