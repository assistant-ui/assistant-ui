import type { ThreadMessage } from "../types/AssistantTypes";

/**
 * Feedback data structure for rating messages.
 */
export type FeedbackAdapterFeedback = {
  /** The message being rated */
  message: ThreadMessage;
  /** The type of feedback being provided */
  type: "positive" | "negative";
};

/**
 * Interface for handling user feedback on assistant messages.
 *
 * FeedbackAdapter allows users to provide positive or negative feedback
 * on assistant responses, which can be used for analytics, model improvement,
 * or user experience tracking.
 */
export type FeedbackAdapter = {
  /**
   * Submits user feedback for a message.
   *
   * @param feedback - The feedback data containing message and rating type
   */
  submit: (feedback: FeedbackAdapterFeedback) => void;
};
