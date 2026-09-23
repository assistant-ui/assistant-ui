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
  onRecordToolInteraction?: (
    options: Unstable_RecordToolInteractionOptions,
  ) => void,
) => {
  const root = createTapRoot(function ExternalThreadRoot() {
    return useResource(
      ExternalThread({
        messages: [message],
        ...(onRecordToolInteraction ? { onRecordToolInteraction } : {}),
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
    const onRecordToolInteraction = vi.fn();
    const { part, unmount } = createPart(onRecordToolInteraction);

    try {
      await part.unstable_recordInteraction!({
        type: "action",
        payload: { action: "toggle" },
      });

      expect(onRecordToolInteraction).toHaveBeenCalledExactlyOnceWith({
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
