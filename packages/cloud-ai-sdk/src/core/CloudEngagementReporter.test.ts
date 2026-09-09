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

const createReporter = () => {
  const track = vi.fn();
  const reporter = new CloudEngagementReporter(
    { events: { track } } as unknown as AssistantCloud,
    (_threadId, messageId) => `cloud-${messageId}`,
  );
  return { reporter, track };
};

describe("CloudEngagementReporter", () => {
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
