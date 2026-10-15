import { describe, expect, it } from "vitest";
import {
  convertLangChainMessages,
  createLangGraphMetadataKey,
} from "./convertLangChainMessages";
import type { LangGraphMessageConverterMetadata } from "./convertLangChainMessages";
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

const metadata = (
  bufferedReplyIds: ReadonlySet<string>,
): LangGraphMessageConverterMetadata => ({ bufferedReplyIds });

describe("buffered computer_call replies", () => {
  it("marks the content block as queued only while its reply is buffered", () => {
    const queuedResult = convertLangChainMessages(
      message,
      metadata(new Set(["computer-1"])),
    );
    const queued = Array.isArray(queuedResult) ? queuedResult[0] : queuedResult;
    if (!queued || queued.role !== "assistant") {
      throw new Error("Expected an assistant message");
    }
    const unqueuedResult = convertLangChainMessages(
      message,
      metadata(new Set()),
    );
    const unqueued = Array.isArray(unqueuedResult)
      ? unqueuedResult[0]
      : unqueuedResult;
    if (!unqueued || unqueued.role !== "assistant") {
      throw new Error("Expected an assistant message");
    }

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
    const initial = getMetadataKey(message, metadata(new Set()));
    const queued = getMetadataKey(message, metadata(new Set(["computer-1"])));
    const released = getMetadataKey(message, metadata(new Set()));

    expect(queued).not.toBe(initial);
    expect(released).not.toBe(queued);
  });
});
