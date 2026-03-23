import {
  createOpenCodeThreadState,
  reduceOpenCodeThreadState,
} from "./openCodeThreadState";
import type { MessageWithParts, PendingUserMessage } from "./types";

describe("reduceOpenCodeThreadState", () => {
  it("reconciles a pending user message with loaded history", () => {
    const initial = createOpenCodeThreadState("ses_1");
    const pending: PendingUserMessage = {
      clientId: "local_1",
      sessionId: "ses_1",
      createdAt: 1000,
      parentId: null,
      sourceId: null,
      runConfig: undefined,
      contentText: "hello world",
      parts: [{ type: "text", text: "hello world" }],
      status: "pending",
    };

    const queued = reduceOpenCodeThreadState(initial, {
      type: "local.message.queued",
      pending,
    });

    const history = reduceOpenCodeThreadState(queued, {
      type: "history.loaded",
      session: null,
      messages: [
        {
          info: {
            id: "msg_1",
            role: "user",
            sessionID: "ses_1",
            time: { created: 1000 },
          },
          parts: [],
        } as MessageWithParts,
      ],
    });

    expect(Object.keys(history.pendingUserMessages)).toHaveLength(0);
    expect(history.messageOrder).toEqual(["msg_1"]);
    expect(history.messagesById["msg_1"]?.shadowParts).toEqual(pending.parts);
  });

  it("adds assistant parts without losing message order", () => {
    const initial = createOpenCodeThreadState("ses_1");

    const withMessage = reduceOpenCodeThreadState(initial, {
      type: "message.updated",
      info: {
        id: "msg_assistant",
        role: "assistant",
        sessionID: "ses_1",
        time: { created: 1001 },
      } as never,
    });

    const withPart = reduceOpenCodeThreadState(withMessage, {
      type: "part.updated",
      messageId: "msg_assistant",
      part: {
        id: "prt_1",
        type: "text",
        text: "Hello",
        sessionID: "ses_1",
        messageID: "msg_assistant",
      } as never,
    });

    expect(withPart.messageOrder).toEqual(["msg_assistant"]);
    expect(withPart.messagesById["msg_assistant"]?.parts).toHaveLength(1);
  });
});
