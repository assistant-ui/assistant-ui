import { afterEach, expect, it, vi } from "vitest";
import { analytics } from "./analytics";

const mocks = vi.hoisted(() => ({ vercelTrack: vi.fn() }));

vi.mock("@vercel/analytics", () => ({
  track: mocks.vercelTrack,
}));

const globalObject = globalThis as {
  window?: {
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

it("analytics does not throw when posthog exists without capture", () => {
  globalObject.window = {
    posthog: {},
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

it("keeps the trace id for PostHog and out of Vercel Analytics", async () => {
  const capture = vi.fn();
  globalObject.window = { posthog: { capture } };
  const props = {
    threadId: "t1",
    response_length: 12,
    tool_calls_count: 0,
    trace_id: "0123456789abcdef0123456789abcdef",
  };

  analytics.assistant.responseCompleted(props);
  await vi.dynamicImportSettled();

  expect(capture).toHaveBeenCalledWith("assistant_response_completed", props);
  expect(mocks.vercelTrack).toHaveBeenCalledWith(
    "assistant_response_completed",
    { threadId: "t1", response_length: 12, tool_calls_count: 0 },
  );
});

it("captures thumbs feedback as a PostHog $ai_metric on the trace", async () => {
  const capture = vi.fn();
  globalObject.window = { posthog: { capture } };

  analytics.assistant.traceFeedback({
    traceId: "0123456789abcdef0123456789abcdef",
    surface: "docs_assistant",
    type: "negative",
    category: "outdated",
    comment_length: 18,
  });
  await vi.dynamicImportSettled();

  expect(capture.mock.calls).toEqual([
    [
      "$ai_metric",
      {
        surface: "docs_assistant",
        category: "outdated",
        comment_length: 18,
        $ai_trace_id: "0123456789abcdef0123456789abcdef",
        $ai_metric_name: "feedback",
        $ai_metric_value: "negative",
      },
    ],
  ]);
  expect(mocks.vercelTrack).not.toHaveBeenCalledWith(
    "$ai_metric",
    expect.anything(),
  );
});

it("tracks WebMCP host detection, registration, and calls to PostHog", () => {
  const capture = vi.fn();
  globalObject.window = { posthog: { capture } };
  const props = { tool: "searchDocs", status: "ok", latency_ms: 12 } as const;

  analytics.webmcp.hostDetected();
  analytics.webmcp.toolRegistered({ tool: "searchDocs", status: "ok" });
  analytics.webmcp.toolCalled(props);

  expect(capture.mock.calls).toEqual([
    ["webmcp_host_detected", undefined],
    ["webmcp_tool_registered", { tool: "searchDocs", status: "ok" }],
    ["webmcp_tool_called", props],
  ]);
});

it("WebMCP tracking does not throw when posthog is undefined", () => {
  globalObject.window = {};

  expect(() => {
    analytics.webmcp.hostDetected();
    analytics.webmcp.toolCalled({
      tool: "getDoc",
      status: "error",
      latency_ms: 0,
    });
  }).not.toThrow();
});
