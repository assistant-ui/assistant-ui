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
    expect(history.messagesById.msg_1?.shadowParts).toEqual(pending.parts);
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
    expect(withPart.messagesById.msg_assistant?.parts).toHaveLength(1);
  });

  it("reconciles a pending user message with a streamed message update", () => {
    const initial = createOpenCodeThreadState("ses_1");
    const pending: PendingUserMessage = {
      clientId: "local_1",
      sessionId: "ses_1",
      createdAt: 1000,
      parentId: "msg_parent",
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

    const updated = reduceOpenCodeThreadState(queued, {
      type: "message.updated",
      info: {
        id: "msg_1",
        role: "user",
        parentID: "msg_parent",
        sessionID: "ses_1",
        time: { created: 1000 },
      } as never,
    });

    expect(Object.keys(updated.pendingUserMessages)).toHaveLength(0);
    expect(updated.messageOrder).toEqual(["msg_1"]);
    expect(updated.messagesById.msg_1?.shadowParts).toEqual(pending.parts);
  });

  it("tracks session status and applies text deltas", () => {
    const initial = createOpenCodeThreadState("ses_1");

    const withStatus = reduceOpenCodeThreadState(initial, {
      type: "session.status",
      status: { type: "busy" },
    });

    const withMessage = reduceOpenCodeThreadState(withStatus, {
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

    const withDelta = reduceOpenCodeThreadState(withPart, {
      type: "part.delta",
      messageId: "msg_assistant",
      partId: "prt_1",
      field: "text",
      delta: " world",
    });

    expect(withDelta.sessionStatus).toEqual({ type: "busy" });
    expect(withDelta.runState.type).toBe("streaming");
    expect(withDelta.messagesById.msg_assistant?.parts).toMatchObject([
      { type: "text", text: "Hello world" },
    ]);
  });

  it("ignores part removals for unknown messages", () => {
    const initial = createOpenCodeThreadState("ses_1");

    const updated = reduceOpenCodeThreadState(initial, {
      type: "part.removed",
      messageId: "missing_message",
      partId: "missing_part",
    });

    expect(updated).toBe(initial);
  });

  it("stores pending questions separately from permissions", () => {
    const initial = createOpenCodeThreadState("ses_1");

    const withQuestion = reduceOpenCodeThreadState(initial, {
      type: "question.asked",
      request: {
        id: "question_1",
        sessionID: "ses_1",
        questions: [
          {
            header: "Confirm",
            question: "Should I continue?",
            options: [
              { label: "Yes", description: "Continue the task." },
              { label: "No", description: "Stop here." },
            ],
          },
        ],
        askedAt: 1000,
      } as never,
    });

    expect(
      withQuestion.interactions.questions.pending.question_1?.questions[0]
        ?.header,
    ).toBe("Confirm");
    expect(
      Object.keys(withQuestion.interactions.permissions.pending),
    ).toHaveLength(0);
  });

  it("retains request details for resolved questions and permissions", () => {
    const initial = createOpenCodeThreadState("ses_1");

    const withPermission = reduceOpenCodeThreadState(initial, {
      type: "permission.asked",
      request: {
        id: "permission_1",
        sessionId: "ses_1",
        permission: "bash",
        patterns: [],
        metadata: {},
        always: [],
        askedAt: 1000,
        raw: {} as never,
        tool: {
          messageID: "msg_1",
          callID: "call_1",
        },
      },
    });

    const resolvedPermission = reduceOpenCodeThreadState(withPermission, {
      type: "permission.replied",
      permissionId: "permission_1",
      reply: "once",
    });

    expect(
      resolvedPermission.interactions.permissions.resolved.permission_1?.request
        .tool?.callID,
    ).toBe("call_1");

    const withQuestion = reduceOpenCodeThreadState(initial, {
      type: "question.asked",
      request: {
        id: "question_1",
        sessionID: "ses_1",
        questions: [
          {
            header: "Confirm",
            question: "Should I continue?",
            options: [],
          },
        ],
        askedAt: 1000,
        tool: {
          messageID: "msg_1",
          callID: "call_2",
        },
      } as never,
    });

    const answeredQuestion = reduceOpenCodeThreadState(withQuestion, {
      type: "question.replied",
      questionId: "question_1",
      answers: [["Yes"]],
    });

    expect(
      answeredQuestion.interactions.questions.answered.question_1?.request.tool
        ?.callID,
    ).toBe("call_2");
  });
});
