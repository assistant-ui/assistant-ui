import { expect, it, vi } from "vitest";
import { LangGraphThreadController } from "./LangGraphThreadController";
import {
  convertLangChainMessages,
  createLangGraphMetadataKey,
} from "./convertLangChainMessages";
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

it("marks a sibling merged into a pending resume queued and clears it when dropped", () => {
  const controller = new LangGraphThreadController();
  const listener = vi.fn();
  controller.subscribe(listener);
  const getMetadataKey = createLangGraphMetadataKey();
  const first = [{ type: "tool" as const, tool_call_id: "c1", content: "1" }];
  const sibling = [{ type: "tool" as const, tool_call_id: "c2", content: "2" }];

  controller.dispatch({
    type: "resume.enqueue",
    groupKey: "run:1",
    batch: first,
  });
  const before = getMetadataKey(message, {
    bufferedReplyIds: controller.getQueuedReplyIds(),
  });
  controller.dispatch({
    type: "resume.enqueue",
    groupKey: "run:1",
    batch: sibling,
  });
  const queuedReplyIds = controller.getQueuedReplyIds();
  const merged = getMetadataKey(message, { bufferedReplyIds: queuedReplyIds });

  expect(controller.getState().pendingResume.get("run:1")?.messages).toEqual([
    ...first,
    ...sibling,
  ]);
  expect(listener).toHaveBeenCalledTimes(2);
  expect(merged).not.toBe(before);
  expect(
    convertLangChainMessages(message, { bufferedReplyIds: queuedReplyIds })
      .content,
  ).toEqual(
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
  expect(
    getMetadataKey(message, { bufferedReplyIds: droppedReplyIds }),
  ).not.toBe(merged);
  expect(
    convertLangChainMessages(message, { bufferedReplyIds: droppedReplyIds })
      .content.filter((part) => part.type === "tool-call")
      .map((part) => part.responseDeliveryStatus),
  ).toEqual([undefined, undefined]);
});
