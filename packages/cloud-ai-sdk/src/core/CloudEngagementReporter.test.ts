import { afterEach, describe, expect, it, vi } from "vitest";
import type { UIMessage } from "@ai-sdk/react";
import type { AssistantCloud } from "assistant-cloud";
import { CloudEngagementReporter } from "./CloudEngagementReporter";

afterEach(() => {
  vi.useRealTimers();
});

const message = (
  id: string,
  role: UIMessage["role"],
  parts: UIMessage["parts"],
): UIMessage => ({ id, role, parts }) as UIMessage;

const pending = () =>
  message("assistant-1", "assistant", [
    {
      type: "tool-delete",
      toolCallId: "tc-1",
      state: "approval-requested",
      input: {},
      approval: { id: "approval-1" },
    },
  ]);

const answered = (approved: boolean) =>
  message("assistant-1", "assistant", [
    {
      type: "tool-delete",
      toolCallId: "tc-1",
      state: "approval-responded",
      input: {},
      approval: { id: "approval-1", approved },
    },
  ]);

const createReporter = () => {
  const track = vi.fn();
  const reporter = new CloudEngagementReporter(
    { events: { track } } as unknown as AssistantCloud,
    (_threadId, messageId) => `cloud-${messageId}`,
  );
  return { reporter, track };
};

describe("CloudEngagementReporter", () => {
  it.each([true, false])(
    "reports a recorded approval with approved=%s",
    (approved) => {
      const { reporter, track } = createReporter();
      reporter.toolApprovalResponded("thread-1", [answered(approved)], {
        id: "approval-1",
        approved,
      });
      expect(track).toHaveBeenCalledExactlyOnceWith({
        kind: approved ? "tool_approved" : "tool_rejected",
        thread_id: "thread-1",
        message_id: "cloud-assistant-1",
      });
    },
  );

  it("ignores decisions the SDK did not record", () => {
    const { reporter, track } = createReporter();
    const decision = { id: "approval-1", approved: false };
    // Unknown approval id.
    reporter.toolApprovalResponded("thread-1", [answered(false)], {
      ...decision,
      id: "unknown",
    });
    // Still pending, or answered the other way.
    reporter.toolApprovalResponded("thread-1", [pending()], decision);
    reporter.toolApprovalResponded("thread-1", [answered(true)], decision);
    // Only the last message can be answered.
    reporter.toolApprovalResponded(
      "thread-1",
      [
        answered(false),
        message("user-2", "user", [{ type: "text", text: "next" }]),
      ],
      decision,
    );
    expect(track).not.toHaveBeenCalled();
  });

  it("reports each approval once", () => {
    const { reporter, track } = createReporter();
    const decision = { id: "approval-1", approved: true };
    reporter.toolApprovalResponded("thread-1", [answered(true)], decision);
    reporter.toolApprovalResponded("thread-1", [answered(true)], decision);
    expect(track).toHaveBeenCalledOnce();
  });

  it("keys approvals by thread, so threads sharing an approval id both report", () => {
    const { reporter, track } = createReporter();
    const decision = { id: "approval-1", approved: true };
    reporter.toolApprovalResponded("thread-1", [answered(true)], decision);
    reporter.toolApprovalResponded("thread-2", [answered(true)], decision);
    expect(track).toHaveBeenCalledTimes(2);
    expect(track).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: "tool_approved", thread_id: "thread-2" }),
    );
  });

  it("tracks sends, stops, regeneration, and errors without message text", () => {
    vi.useFakeTimers();
    vi.setSystemTime(100);
    const { reporter, track } = createReporter();
    const messages = [
      message("user-1", "user", [
        { type: "text", text: "hello" },
        {
          type: "file",
          mediaType: "image/png",
          filename: "private.png",
          url: "https://example.com/file",
        } as UIMessage["parts"][number],
      ]),
      message("assistant-1", "assistant", [{ type: "text", text: "hi" }]),
    ];

    reporter.messageSent("thread-1", messages);
    vi.setSystemTime(125);
    reporter.runStopped("thread-1");
    reporter.messageRegenerated("thread-1", messages);
    reporter.errorShown("thread-1", messages);

    expect(track).toHaveBeenCalledWith({
      kind: "message_sent",
      thread_id: "thread-1",
      message_id: "cloud-user-1",
      props: { chars: 5, attachments: 1 },
    });
    expect(track).toHaveBeenCalledWith({
      kind: "run_stopped",
      thread_id: "thread-1",
      value: 25,
    });
    expect(track).toHaveBeenCalledWith({
      kind: "message_regenerated",
      thread_id: "thread-1",
      message_id: "cloud-assistant-1",
    });
    expect(track).toHaveBeenCalledWith({
      kind: "error_shown",
      thread_id: "thread-1",
      message_id: "cloud-assistant-1",
      props: { reason: "error" },
    });
    expect(JSON.stringify(track.mock.calls)).not.toContain("hello");
    expect(JSON.stringify(track.mock.calls)).not.toContain("private.png");
  });

  it("does not report duplicate stops or errors for one run", () => {
    const { reporter, track } = createReporter();
    const messages = [message("assistant-1", "assistant", [])];

    reporter.runStopped("thread-1");
    reporter.runStopped("thread-1");
    reporter.errorShown("thread-1", messages);
    reporter.errorShown("thread-1", messages);

    expect(track).toHaveBeenCalledTimes(2);
  });
});
