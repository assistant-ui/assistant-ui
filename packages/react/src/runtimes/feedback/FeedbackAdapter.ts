import { ThreadMessage } from "../../types/AssistantTypes";

type FeedbackAdapterFeedback = {
  message: ThreadMessage;
  type: "positive" | "negative";
};

export type FeedbackAdapter = {
  submit: (feedback: FeedbackAdapterFeedback) => void;
};
