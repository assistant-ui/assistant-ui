import { describe, it, expect, vi } from "vitest";
import { OpenCodeThreadController } from "./OpenCodeThreadController";
import { STREAM_RECONNECTED_EVENT_TYPE } from "./OpenCodeEventSource";
import type { OpenCodeServerEvent } from "./types";

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const createEventSource = () => {
  let listener: ((event: OpenCodeServerEvent) => void) | undefined;
  const unsubscribe = vi.fn();

  return {
    emit(event: OpenCodeServerEvent) {
      listener?.(event);
    },
    subscribe: vi.fn((nextListener: (event: OpenCodeServerEvent) => void) => {
      listener = nextListener;
      return unsubscribe;
    }),
    unsubscribe,
  };
};

const streamReconnected: OpenCodeServerEvent = {
  type: STREAM_RECONNECTED_EVENT_TYPE,
  sessionId: undefined,
  raw: undefined,
  properties: {},
};

const createReconnectClient = ({
  status = vi.fn().mockResolvedValue({ data: {} }),
  permissions = vi.fn().mockResolvedValue({ data: [] }),
  questions = vi.fn().mockResolvedValue({ data: [] }),
} = {}) => ({
  session: {
    get: vi
      .fn()
      .mockResolvedValue({ data: { id: "ses_1", title: "t", time: {} } }),
    messages: vi.fn().mockResolvedValue({ data: [] }),
    status,
  },
  permission: { list: permissions },
  question: { list: questions },
});

describe("OpenCodeThreadController", () => {
  it("keeps the deprecated fork method inclusive", async () => {
    const client = {
      session: {
        messages: vi.fn().mockResolvedValue({
          data: [
            { info: { id: "msg_1" }, parts: [] },
            { info: { id: "msg_2" }, parts: [] },
          ],
        }),
        fork: vi.fn().mockResolvedValue({ data: { id: "ses_fork" } }),
      },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => ({ subscribe: () => () => {} }),
      "ses_1",
    );

    await expect(controller.fork("msg_1")).resolves.toBe("ses_fork");
    expect(client.session.fork).toHaveBeenCalledWith({
      sessionID: "ses_1",
      messageID: "msg_2",
    });
  });

  it("stages a message locally and sends it later", async () => {
    const client = {
      session: {
        promptAsync: vi.fn().mockResolvedValue({}),
      },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => ({ subscribe: () => () => {} }),
      "ses_1",
    );

    await controller.stageMessage(
      {
        role: "user",
        parentId: null,
        sourceId: null,
        content: [{ type: "text", text: "hello" }],
        attachments: [],
        metadata: { custom: {} },
        runConfig: {},
        createdAt: new Date(),
      },
      { model: { providerID: "anthropic", modelID: "claude" } },
    );

    const pendingId = Object.keys(controller.getState().pendingUserMessages)[0];
    expect(pendingId).toBeDefined();
    expect(client.session.promptAsync).not.toHaveBeenCalled();

    await expect(
      controller.sendStagedMessage(`local:${pendingId}`),
    ).resolves.toBe(true);

    expect(client.session.promptAsync).toHaveBeenCalledWith({
      sessionID: "ses_1",
      parts: [{ type: "text", text: "hello" }],
      model: { providerID: "anthropic", modelID: "claude" },
    });
    await expect(
      controller.sendStagedMessage(`local:${pendingId}`),
    ).resolves.toBe(false);
  });

  it("keeps a staged message when sending it fails", async () => {
    const client = {
      session: {
        promptAsync: vi
          .fn()
          .mockRejectedValueOnce(new Error("boom"))
          .mockResolvedValueOnce({}),
      },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => ({ subscribe: () => () => {} }),
      "ses_1",
    );

    await controller.stageMessage({
      role: "user",
      parentId: null,
      sourceId: null,
      content: [{ type: "text", text: "hello" }],
      attachments: [],
      metadata: { custom: {} },
      runConfig: {},
      createdAt: new Date(),
    });

    const pendingId = Object.keys(controller.getState().pendingUserMessages)[0];
    await expect(
      controller.sendStagedMessage(`local:${pendingId}`),
    ).rejects.toThrow("boom");

    await expect(
      controller.sendStagedMessage(`local:${pendingId}`),
    ).resolves.toBe(true);
  });

  it("re-subscribes through the provider after dispose", () => {
    let eventSource = createEventSource();
    const getEventSource = vi.fn(() => eventSource);
    const controller = new OpenCodeThreadController(
      {} as never,
      getEventSource,
      "ses_1",
    );

    const firstListener = vi.fn();
    controller.subscribe(firstListener);

    expect(getEventSource).toHaveBeenCalledTimes(1);
    expect(eventSource.subscribe).toHaveBeenCalledTimes(1);

    controller.dispose();

    expect(eventSource.unsubscribe).toHaveBeenCalledTimes(1);

    eventSource = createEventSource();
    const secondListener = vi.fn();
    controller.subscribe(secondListener);

    eventSource.emit({
      type: "session.updated",
      sessionId: "ses_1",
      properties: {
        info: {
          id: "ses_1",
          title: "Recovered session",
          time: {},
        },
      },
      raw: {},
    });

    expect(getEventSource).toHaveBeenCalledTimes(2);
    expect(eventSource.subscribe).toHaveBeenCalledTimes(1);
    expect(secondListener).toHaveBeenCalledTimes(1);
    expect(controller.getState().session).toMatchObject({
      id: "ses_1",
      title: "Recovered session",
    });
  });

  it("detaches from OpenCode events when the last state listener unsubscribes", () => {
    const eventSource = createEventSource();
    const controller = new OpenCodeThreadController(
      {} as never,
      () => eventSource,
      "ses_1",
    );

    const unsubscribeFirstState = controller.subscribe(vi.fn());
    const secondListener = vi.fn();
    const unsubscribeSecondState = controller.subscribe(secondListener);

    expect(eventSource.subscribe).toHaveBeenCalledTimes(1);

    unsubscribeFirstState();

    expect(eventSource.unsubscribe).not.toHaveBeenCalled();

    eventSource.emit({
      type: "session.updated",
      sessionId: "ses_1",
      properties: {
        info: {
          id: "ses_1",
          title: "Still attached",
          time: {},
        },
      },
      raw: {},
    });

    expect(secondListener).toHaveBeenCalledTimes(1);

    unsubscribeSecondState();

    expect(eventSource.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("supports detached subscribe and getState references", () => {
    const eventSource = createEventSource();
    const controller = new OpenCodeThreadController(
      {} as never,
      () => eventSource,
      "ses_1",
    );

    const { subscribe, getState } = controller;
    const unsubscribe = subscribe(vi.fn());

    expect(eventSource.subscribe).toHaveBeenCalledTimes(1);
    expect(getState().sessionId).toBe("ses_1");

    unsubscribe();

    expect(eventSource.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("re-syncs history and status when the stream reconnects", async () => {
    const eventSource = createEventSource();
    const client = createReconnectClient();
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());

    eventSource.emit({
      type: "session.status",
      sessionId: "ses_1",
      properties: { status: { type: "busy" } },
      raw: {},
    });

    expect(controller.getState().sessionStatus).toMatchObject({
      type: "busy",
    });

    eventSource.emit(streamReconnected);

    await vi.waitFor(() => {
      expect(controller.getState().sessionStatus).toMatchObject({
        type: "idle",
      });
    });
    expect(controller.getState().runState).toMatchObject({ type: "idle" });
    expect(client.session.status).toHaveBeenCalledTimes(1);
    expect(client.session.get).toHaveBeenCalledTimes(1);
    expect(client.session.messages).toHaveBeenCalledTimes(1);
  });

  it("keeps a busy status the server still reports after reconnect", async () => {
    const eventSource = createEventSource();
    const client = createReconnectClient({
      status: vi.fn().mockResolvedValue({ data: { ses_1: { type: "busy" } } }),
    });
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());

    eventSource.emit(streamReconnected);

    await vi.waitFor(() => {
      expect(controller.getState().sessionStatus).toMatchObject({
        type: "busy",
      });
    });
    expect(controller.getState().runState).toMatchObject({
      type: "streaming",
    });
  });

  it("keeps current state when the status endpoint is unavailable", async () => {
    const eventSource = createEventSource();
    const client = createReconnectClient({
      status: vi.fn().mockRejectedValue(new Error("404")),
    });
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());

    eventSource.emit({
      type: "session.status",
      sessionId: "ses_1",
      properties: { status: { type: "busy" } },
      raw: {},
    });

    eventSource.emit(streamReconnected);

    await vi.waitFor(() => {
      expect(client.session.get).toHaveBeenCalledTimes(1);
      expect(client.session.status).toHaveBeenCalledTimes(1);
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(controller.getState().sessionStatus).toMatchObject({
      type: "busy",
    });
  });

  it("re-surfaces pending permissions and questions after reconnect", async () => {
    const eventSource = createEventSource();
    const client = createReconnectClient({
      permissions: vi.fn().mockResolvedValue({
        data: [
          {
            id: "perm_1",
            sessionID: "ses_1",
            permission: "fs.write",
            metadata: {},
          },
          {
            id: "perm_2",
            sessionID: "ses_other",
            permission: "fs.write",
            metadata: {},
          },
        ],
      }),
      questions: vi.fn().mockResolvedValue({
        data: [
          { id: "q_1", sessionID: "ses_1", questions: [] },
          { id: "q_2", sessionID: "ses_other", questions: [] },
        ],
      }),
    });
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());

    eventSource.emit(streamReconnected);

    await vi.waitFor(() => {
      expect(
        Object.keys(controller.getState().interactions.permissions.pending),
      ).toEqual(["perm_1"]);
      expect(
        Object.keys(controller.getState().interactions.questions.pending),
      ).toEqual(["q_1"]);
    });
  });

  it("ignores stale status responses from a superseded reconnect", async () => {
    const eventSource = createEventSource();
    const firstStatus = createDeferred<{ data: Record<string, unknown> }>();
    const secondStatus = createDeferred<{ data: Record<string, unknown> }>();
    const client = createReconnectClient({
      status: vi
        .fn()
        .mockImplementationOnce(() => firstStatus.promise)
        .mockImplementationOnce(() => secondStatus.promise),
    });
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());

    eventSource.emit(streamReconnected);
    eventSource.emit(streamReconnected);

    secondStatus.resolve({ data: {} });

    await vi.waitFor(() => {
      expect(controller.getState().sessionStatus).toMatchObject({
        type: "idle",
      });
    });

    firstStatus.resolve({ data: { ses_1: { type: "busy" } } });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(controller.getState().sessionStatus).toMatchObject({
      type: "idle",
    });
  });

  it("keeps forced reloads authoritative while earlier loads finish", async () => {
    const firstSession = createDeferred<{ data: unknown }>();
    const firstMessages = createDeferred<{ data: unknown[] }>();
    const secondSession = createDeferred<{ data: unknown }>();
    const secondMessages = createDeferred<{ data: unknown[] }>();

    const client = {
      session: {
        get: vi
          .fn()
          .mockReturnValueOnce(firstSession.promise)
          .mockReturnValueOnce(secondSession.promise),
        messages: vi
          .fn()
          .mockReturnValueOnce(firstMessages.promise)
          .mockReturnValueOnce(secondMessages.promise),
      },
    };

    const controller = new OpenCodeThreadController(
      client as never,
      () => ({ subscribe: () => () => {} }),
      "ses_1",
    );

    const firstLoad = controller.load();
    const secondLoad = controller.load(true);

    firstSession.resolve({
      data: {
        id: "stale_session",
        time: {},
      },
    });
    firstMessages.resolve({
      data: [
        {
          info: {
            id: "stale_message",
            role: "user",
            sessionID: "ses_1",
            time: { created: 1 },
          },
          parts: [],
        },
      ],
    });

    await firstLoad;

    expect(controller.getState().loadState.type).toBe("loading");

    const thirdLoad = controller.load();
    expect(client.session.get).toHaveBeenCalledTimes(2);
    expect(client.session.messages).toHaveBeenCalledTimes(2);

    secondSession.resolve({
      data: {
        id: "fresh_session",
        time: {},
      },
    });
    secondMessages.resolve({
      data: [
        {
          info: {
            id: "fresh_message",
            role: "user",
            sessionID: "ses_1",
            time: { created: 2 },
          },
          parts: [],
        },
      ],
    });

    await Promise.all([secondLoad, thirdLoad]);

    expect(controller.getState().loadState.type).toBe("ready");
    expect(controller.getState().session).toMatchObject({
      id: "fresh_session",
    });
    expect(controller.getState().messageOrder).toEqual(["fresh_message"]);
  });

  it("replies to questions and stores answered state", async () => {
    const client = {
      session: {
        get: vi.fn(),
        messages: vi.fn(),
      },
      question: {
        reply: vi.fn().mockResolvedValue({}),
        reject: vi.fn().mockResolvedValue({}),
      },
    };

    const controller = new OpenCodeThreadController(
      client as never,
      () => ({ subscribe: () => () => {} }),
      "ses_1",
    );

    (controller as unknown as { dispatch: (event: unknown) => void }).dispatch({
      type: "question.asked",
      request: {
        id: "question_1",
        sessionID: "ses_1",
        questions: [],
        askedAt: 1000,
        tool: {
          messageID: "msg_1",
          callID: "call_1",
        },
      },
    });

    await controller.replyToQuestion("question_1", [["Yes"]]);

    expect(client.question.reply).toHaveBeenCalledWith({
      requestID: "question_1",
      answers: [["Yes"]],
    });
    expect(
      controller.getState().interactions.questions.answered.question_1,
    ).toMatchObject({
      answers: [["Yes"]],
    });
    expect(
      controller.getState().interactions.questions.pending.question_1,
    ).toBeUndefined();
  });

  it("rejects questions and stores rejected state", async () => {
    const client = {
      session: {
        get: vi.fn(),
        messages: vi.fn(),
      },
      question: {
        reply: vi.fn().mockResolvedValue({}),
        reject: vi.fn().mockResolvedValue({}),
      },
    };

    const controller = new OpenCodeThreadController(
      client as never,
      () => ({ subscribe: () => () => {} }),
      "ses_1",
    );

    (controller as unknown as { dispatch: (event: unknown) => void }).dispatch({
      type: "question.asked",
      request: {
        id: "question_1",
        sessionID: "ses_1",
        questions: [],
        askedAt: 1000,
        tool: {
          messageID: "msg_1",
          callID: "call_1",
        },
      },
    });

    await controller.rejectQuestion("question_1");

    expect(client.question.reject).toHaveBeenCalledWith({
      requestID: "question_1",
    });
    expect(
      controller.getState().interactions.questions.rejected.question_1,
    ).toBeDefined();
    expect(
      controller.getState().interactions.questions.pending.question_1,
    ).toBeUndefined();
  });
});
