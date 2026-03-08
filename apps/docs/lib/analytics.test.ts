import { afterEach, expect, it, vi } from "vitest";
import { analytics } from "./analytics";

vi.mock("@vercel/analytics", () => ({
  track: vi.fn(),
}));

const globalObject = globalThis as {
  window?: {
    umami?: unknown;
    posthog?: {
      capture?: (
        event: string,
        properties?: Record<string, string | number | boolean>,
      ) => void;
    };
  };
};

const previousWindow = globalObject.window;

afterEach(() => {
  if (previousWindow === undefined) {
    delete globalObject.window;
  } else {
    globalObject.window = previousWindow;
  }
});

it("analytics does not throw when umami exists without track", () => {
  globalObject.window = {
    umami: {},
  };

  expect(() => {
    analytics.cta.clicked("get_started", "header");
  }).not.toThrow();
});

it("tracks assistant feedback lifecycle events to PostHog", () => {
  const capture = vi.fn();
  globalObject.window = {
    posthog: {
      capture,
    },
  };

  analytics.assistant.feedbackShown({
    threadId: "thread-1",
    messageId: "message-1",
    user_question_length: 12,
    assistant_response_length: 34,
    tool_calls_count: 1,
    tool_names: "readDoc",
  });

  analytics.assistant.feedbackClicked({
    threadId: "thread-1",
    messageId: "message-1",
    type: "negative",
    category: "wrong_information",
    comment_length: 24,
    user_question_length: 12,
    assistant_response_length: 34,
    tool_calls_count: 1,
    tool_names: "readDoc",
  });

  analytics.assistant.feedbackSubmitFailed({
    threadId: "thread-1",
    messageId: "message-1",
    type: "negative",
    category: "wrong_information",
    comment_length: 24,
    user_question_length: 12,
    assistant_response_length: 34,
    tool_calls_count: 1,
    tool_names: "readDoc",
    error_name: "TypeError",
    error_message: "Failed to submit feedback",
  });

  expect(capture).toHaveBeenNthCalledWith(
    1,
    "assistant_feedback_shown",
    expect.objectContaining({
      threadId: "thread-1",
      messageId: "message-1",
    }),
  );

  expect(capture).toHaveBeenNthCalledWith(
    2,
    "assistant_feedback_clicked",
    expect.objectContaining({
      type: "negative",
      category: "wrong_information",
    }),
  );

  expect(capture).toHaveBeenNthCalledWith(
    3,
    "assistant_feedback_submit_failed",
    expect.objectContaining({
      error_name: "TypeError",
      error_message: "Failed to submit feedback",
    }),
  );
});
