import type { FeedbackAdapter } from "@assistant-ui/react";

/**
 * Every runtime that can render AssistantActionBar must pass this adapter.
 * The action bar calls submitFeedback, and the runtime throws
 * "Feedback adapter not configured" when adapters.feedback is absent, which
 * surfaces to the user as a failed submission toast.
 *
 * Submitting is a no-op because the feedback itself is recorded by the
 * analytics calls in AssistantActionBar; the runtime only needs the adapter to
 * mark message.metadata.submittedFeedback so the buttons enter their submitted
 * state. Stateless, so a single instance is safe to share.
 */
export const feedbackAdapter: FeedbackAdapter = {
  submit: () => {},
};
