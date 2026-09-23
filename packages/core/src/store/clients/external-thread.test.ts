import { createTapRoot, useResource } from "@assistant-ui/tap";
import { describe, expect, it, vi } from "vitest";
import type { Unstable_RecordToolInteractionOptions } from "../../runtime/interfaces/thread-runtime-core";
import type { ExternalThreadMessage } from "./external-thread";
import { ExternalThread } from "./external-thread";

const message: ExternalThreadMessage = {
  id: "message-1",
  role: "assistant",
  createdAt: new Date(0),
  content: [
    {
      type: "tool-call",
      toolCallId: "call-1",
      toolName: "weather",
      args: {},
      argsText: "{}",
    },
  ],
  status: { type: "complete", reason: "stop" },
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
};

const createPart = (
  unstable_onRecordToolInteraction?: (
    options: Unstable_RecordToolInteractionOptions,
  ) => void,
  onResumeToolCall?: (options: {
    toolCallId: string;
    payload: unknown;
  }) => void,
) => {
  const root = createTapRoot(function ExternalThreadRoot() {
    return useResource(
      ExternalThread({
        messages: [message],
        ...(unstable_onRecordToolInteraction
          ? { unstable_onRecordToolInteraction }
          : {}),
        ...(onResumeToolCall ? { onResumeToolCall } : {}),
      }),
    );
  });
  return {
    part: root.getValue().message({ index: 0 }).part({ index: 0 }),
    unmount: () => root.unmount(),
  };
};

describe("ExternalThread interaction recording", () => {
  it("threads records from parts to the callback", async () => {
    const unstable_onRecordToolInteraction = vi.fn();
    const { part, unmount } = createPart(unstable_onRecordToolInteraction);

    try {
      await part.unstable_recordInteraction!({
        type: "action",
        payload: { action: "toggle" },
      });

      expect(unstable_onRecordToolInteraction).toHaveBeenCalledExactlyOnceWith({
        messageId: "message-1",
        toolCallId: "call-1",
        interaction: {
          type: "action",
          payload: { action: "toggle" },
          occurredAt: expect.any(Number),
        },
      });
    } finally {
      unmount();
    }
  });

  it("records an accepted human response after resuming", async () => {
    const onResumeToolCall = vi.fn();
    const unstable_onRecordToolInteraction = vi.fn();
    const { part, unmount } = createPart(
      unstable_onRecordToolInteraction,
      onResumeToolCall,
    );
    const payload = { answer: "yes" };

    try {
      part.resumeToolCall(payload);

      expect(onResumeToolCall).toHaveBeenCalledExactlyOnceWith({
        toolCallId: "call-1",
        payload,
      });
      await vi.waitFor(() =>
        expect(
          unstable_onRecordToolInteraction,
        ).toHaveBeenCalledExactlyOnceWith({
          messageId: "message-1",
          toolCallId: "call-1",
          interaction: {
            type: "human-response",
            payload,
            occurredAt: expect.any(Number),
          },
        }),
      );
      expect(onResumeToolCall.mock.invocationCallOrder[0]).toBeLessThan(
        unstable_onRecordToolInteraction.mock.invocationCallOrder[0]!,
      );
    } finally {
      unmount();
    }
  });

  it("keeps an accepted resume successful when recording fails", async () => {
    const onResumeToolCall = vi.fn();
    const record = vi.fn(() => Promise.reject(new Error("recording failed")));
    const { part, unmount } = createPart(record, onResumeToolCall);

    try {
      expect(() => part.resumeToolCall({ answer: "yes" })).not.toThrow();
      await vi.waitFor(() => expect(record).toHaveBeenCalledOnce());
      expect(onResumeToolCall).toHaveBeenCalledOnce();
    } finally {
      unmount();
    }
  });

  it("rejects when no interaction callback is configured", async () => {
    const { part, unmount } = createPart();

    try {
      await expect(
        part.unstable_recordInteraction!({ type: "action", payload: {} }),
      ).rejects.toThrow(
        "Runtime does not support recording tool interactions.",
      );
    } finally {
      unmount();
    }
  });
});
