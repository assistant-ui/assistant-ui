import { describe, expect, it } from "vitest";
import {
  convertLangChainMessages,
  createLangGraphMetadataKey,
} from "./convertLangChainMessages";
import type { LangChainMessage } from "./types";

const message: LangChainMessage = {
  type: "ai",
  id: "ai-1",
  content: [
    {
      type: "computer_call",
      call_id: "computer-1",
      id: "block-1",
      action: { kind: "click" },
      pending_safety_checks: [],
      index: 0,
    },
  ],
};

describe("buffered computer_call replies", () => {
  it("marks the content block as queued only while its reply is buffered", () => {
    const queued = convertLangChainMessages(message, {
      bufferedReplyIds: new Set(["computer-1"]),
    });
    const unqueued = convertLangChainMessages(message, {
      bufferedReplyIds: new Set(),
    });

    expect(queued.content).toMatchObject([
      {
        type: "tool-call",
        toolCallId: "computer-1",
        toolName: "computer_call",
        responseDeliveryStatus: "queued",
      },
    ]);
    expect(unqueued.content[0]).not.toHaveProperty("responseDeliveryStatus");
  });

  it("updates the metadata key when a computer_call reply is buffered or released", () => {
    const getMetadataKey = createLangGraphMetadataKey();
    const initial = getMetadataKey(message, { bufferedReplyIds: new Set() });
    const queued = getMetadataKey(message, {
      bufferedReplyIds: new Set(["computer-1"]),
    });
    const released = getMetadataKey(message, { bufferedReplyIds: new Set() });

    expect(queued).not.toBe(initial);
    expect(released).not.toBe(queued);
  });
});
