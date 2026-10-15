import { expect, it, vi } from "vitest";
import { LangGraphThreadController } from "./LangGraphThreadController";
import {
  convertLangChainMessages,
  createLangGraphMetadataKey,
} from "./convertLangChainMessages";
import type { LangGraphMessageConverterMetadata } from "./convertLangChainMessages";
import type { LangChainMessage } from "./types";

const message: LangChainMessage = {
  type: "ai",
  id: "calls",
  content: "",
  tool_calls: [
    { id: "c1", name: "ask", args: {} },
    { id: "c2", name: "ask", args: {} },
  ],
};

const metadata = (
  bufferedReplyIds: ReadonlySet<string>,
): LangGraphMessageConverterMetadata => ({ bufferedReplyIds });

it("marks a sibling merged into a pending resume queued and clears it when dropped", () => {
  const controller = new LangGraphThreadController();
  const listener = vi.fn();
  controller.subscribe(listener);
  const getMetadataKey = createLangGraphMetadataKey();
  const first: Extract<LangChainMessage, { type: "tool" }>[] = [
    {
      type: "tool",
      tool_call_id: "c1",
      name: "ask",
      content: "1",
      status: "success",
    },
  ];
  const sibling: Extract<LangChainMessage, { type: "tool" }>[] = [
    {
      type: "tool",
      tool_call_id: "c2",
      name: "ask",
      content: "2",
      status: "success",
    },
  ];

  controller.dispatch({
    type: "resume.enqueue",
    groupKey: "run:1",
    batch: first,
  });
  const before = getMetadataKey(
    message,
    metadata(controller.getQueuedReplyIds()),
  );
  controller.dispatch({
    type: "resume.enqueue",
    groupKey: "run:1",
    batch: sibling,
  });
  const queuedReplyIds = controller.getQueuedReplyIds();
  const merged = getMetadataKey(message, metadata(queuedReplyIds));

  expect(controller.getState().pendingResume.get("run:1")?.messages).toEqual([
    ...first,
    ...sibling,
  ]);
  expect(listener).toHaveBeenCalledTimes(2);
  expect(merged).not.toBe(before);
  const queuedResult = convertLangChainMessages(
    message,
    metadata(queuedReplyIds),
  );
  const queuedMessage = Array.isArray(queuedResult)
    ? queuedResult[0]
    : queuedResult;
  if (!queuedMessage || queuedMessage.role !== "assistant") {
    throw new Error("Expected an assistant message");
  }
  expect(queuedMessage.content).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: "tool-call",
        toolCallId: "c1",
        responseDeliveryStatus: "queued",
      }),
      expect.objectContaining({
        type: "tool-call",
        toolCallId: "c2",
        responseDeliveryStatus: "queued",
      }),
    ]),
  );

  controller.dispatch({ type: "run.cancelled" });
  const droppedReplyIds = controller.getQueuedReplyIds();
  expect(droppedReplyIds.size).toBe(0);
  expect(getMetadataKey(message, metadata(droppedReplyIds))).not.toBe(merged);
  const droppedResult = convertLangChainMessages(
    message,
    metadata(droppedReplyIds),
  );
  const droppedMessage = Array.isArray(droppedResult)
    ? droppedResult[0]
    : droppedResult;
  if (!droppedMessage || droppedMessage.role !== "assistant") {
    throw new Error("Expected an assistant message");
  }
  if (typeof droppedMessage.content === "string") {
    throw new Error("Expected array content");
  }
  expect(
    droppedMessage.content
      .filter((part) => part.type === "tool-call")
      .map((part) =>
        "responseDeliveryStatus" in part
          ? part.responseDeliveryStatus
          : undefined,
      ),
  ).toEqual([undefined, undefined]);
});
