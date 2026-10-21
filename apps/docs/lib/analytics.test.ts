import { afterEach, expect, expectTypeOf, it, vi } from "vitest";
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

// AI conversation logs are kept apart from browser analytics, so no assistant
// event may carry the generation's trace id or report a metric against it.
it("keeps AI trace ids and $ai_metric out of assistant analytics", () => {
  type Props<K extends keyof typeof analytics.assistant> = Parameters<
    (typeof analytics.assistant)[K]
  >[0];
  expectTypeOf<Props<"responseCompleted">>().not.toHaveProperty("trace_id");
  expectTypeOf<Props<"responseFailed">>().not.toHaveProperty("trace_id");
  expectTypeOf<Props<"feedbackShown">>().not.toHaveProperty("trace_id");
  expectTypeOf<Props<"feedbackClicked">>().not.toHaveProperty("trace_id");
  expectTypeOf<Props<"feedbackSubmitted">>().not.toHaveProperty("trace_id");
  expectTypeOf<Props<"feedbackSubmitFailed">>().not.toHaveProperty("trace_id");
  expect(Object.keys(analytics.assistant)).not.toContain("traceFeedback");
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
