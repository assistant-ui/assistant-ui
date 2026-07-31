import { describe, it, expect, vi } from "vitest";
import { OpenCodeThreadController } from "./OpenCodeThreadController";
import { STREAM_RECONNECTED_EVENT_TYPE } from "./OpenCodeEventSource";
import { rejectWhenThrowing } from "./testUtils";
import type { OpenCodeServerEvent } from "./types";

const getOpenCodeTaskSessionIdSpy = vi.hoisted(() => vi.fn());

vi.mock("./openCodeTaskSession", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./openCodeTaskSession")>();

  return {
    ...original,
    getOpenCodeTaskSessionId: (
      part: Parameters<typeof original.getOpenCodeTaskSessionId>[0],
    ) => {
      getOpenCodeTaskSessionIdSpy(part);
      return original.getOpenCodeTaskSessionId(part);
    },
  };
});

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
  const listeners = new Set<(event: OpenCodeServerEvent) => void>();
  const unsubscribe = vi.fn();

  return {
    emit(event: OpenCodeServerEvent) {
      for (const listener of listeners) listener(event);
    },
    subscribe: vi.fn((nextListener: (event: OpenCodeServerEvent) => void) => {
      listeners.add(nextListener);
      return () => {
        listeners.delete(nextListener);
        unsubscribe();
      };
    }),
    unsubscribe,
  };
};

const createTaskMessage = (
  sessionID: string,
  messageID: string,
  children: readonly string[],
) => ({
  info: {
    id: messageID,
    role: "assistant",
    sessionID,
    parentID: `${messageID}-parent`,
    modelID: "model",
    providerID: "provider",
    mode: "primary",
    path: { cwd: "/", root: "/" },
    cost: 0,
    tokens: {
      input: 0,
      output: 0,
      reasoning: 0,
      cache: { read: 0, write: 0 },
    },
    time: { created: 1 },
    finish: "stop",
  },
  parts: children.map((childSessionID, index) => ({
    id: `${messageID}-task-${index}`,
    callID: `${messageID}-call-${index}`,
    sessionID,
    messageID,
    type: "tool",
    tool: "task",
    state: {
      status: "completed",
      input: { description: `Task ${index}` },
      output: "Done",
      title: `Task ${index}`,
      metadata: { sessionId: childSessionID },
      time: { start: 1, end: 2 },
    },
  })),
});

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
  it.each([
    {
      label: "wraps a bare base64 file payload",
      data: "JVBERi0xLjQ=",
      url: "data:application/pdf;base64,JVBERi0xLjQ=",
    },
    {
      label: "forwards a data url untouched",
      data: "data:application/pdf;base64,JVBERi0xLjQ=",
      url: "data:application/pdf;base64,JVBERi0xLjQ=",
    },
    {
      label: "forwards an http source untouched",
      data: "https://cdn.example.com/a.pdf",
      url: "https://cdn.example.com/a.pdf",
    },
  ])("$label into a parsable file part url", async ({ data, url }) => {
    const client = {
      session: { promptAsync: vi.fn().mockResolvedValue({}) },
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
        content: [
          {
            type: "file",
            data,
            mimeType: "application/pdf",
            filename: "a.pdf",
          },
        ],
        attachments: [],
        metadata: { custom: {} },
        runConfig: {},
        createdAt: new Date(),
      } as never,
      { model: { providerID: "anthropic", modelID: "claude" } },
    );

    const pendingId = Object.keys(
      controller.getState().pendingUserMessages,
    )[0]!;
    await controller.sendStagedMessage(`local:${pendingId}`);

    const sent = client.session.promptAsync.mock.calls[0]![0] as {
      parts: Array<Record<string, unknown>>;
    };
    const filePart = sent.parts.find((part) => part["type"] === "file");
    expect(filePart).toMatchObject({ mime: "application/pdf", url });
    expect(() => new URL(String(filePart!["url"]))).not.toThrow();
  });

  it("leaves an id reference unwrapped rather than shipping it as base64", async () => {
    const client = {
      session: { promptAsync: vi.fn().mockResolvedValue({}) },
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
        content: [
          {
            type: "file",
            data: "file-abc123",
            mimeType: "application/pdf",
            sourceType: "id",
          },
        ],
        attachments: [],
        metadata: { custom: {} },
        runConfig: {},
        createdAt: new Date(),
      } as never,
      { model: { providerID: "anthropic", modelID: "claude" } },
    );

    const pendingId = Object.keys(
      controller.getState().pendingUserMessages,
    )[0]!;
    await controller.sendStagedMessage(`local:${pendingId}`);

    const sent = client.session.promptAsync.mock.calls[0]![0] as {
      parts: Array<Record<string, unknown>>;
    };
    expect(sent.parts.find((part) => part["type"] === "file")).toMatchObject({
      url: "file-abc123",
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

    expect(client.session.promptAsync).toHaveBeenCalledWith(
      {
        sessionID: "ses_1",
        parts: [{ type: "text", text: "hello" }],
        model: { providerID: "anthropic", modelID: "claude" },
      },
      { throwOnError: true },
    );
    await expect(
      controller.sendStagedMessage(`local:${pendingId}`),
    ).resolves.toBe(false);
  });

  it("resets a failed staged message when retrying", async () => {
    const retry = createDeferred<unknown>();
    const client = {
      session: {
        promptAsync: vi
          .fn()
          .mockRejectedValueOnce(new Error("boom"))
          .mockReturnValueOnce(retry.promise),
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
    expect(controller.getState().pendingUserMessages[pendingId!]).toMatchObject(
      {
        status: "failed",
        error: expect.any(Error),
      },
    );

    const retryRequest = controller.sendStagedMessage(`local:${pendingId}`);
    expect(controller.getState().pendingUserMessages[pendingId!]).toMatchObject(
      {
        status: "pending",
      },
    );
    expect(
      controller.getState().pendingUserMessages[pendingId!]?.error,
    ).toBeUndefined();

    retry.resolve({});
    await expect(retryRequest).resolves.toBe(true);
  });

  it("marks a message failed when the OpenCode SDK returns an error", async () => {
    const error = new Error("Unauthorized");
    const promptAsync = rejectWhenThrowing(error);
    const controller = new OpenCodeThreadController(
      { session: { promptAsync } } as never,
      () => ({ subscribe: () => () => {} }),
      "ses_1",
    );

    await expect(
      controller.sendMessage({
        role: "user",
        parentId: null,
        sourceId: null,
        content: [{ type: "text", text: "hello" }],
        attachments: [],
        metadata: { custom: {} },
        runConfig: {},
        createdAt: new Date(),
      }),
    ).rejects.toBe(error);

    expect(Object.values(controller.getState().pendingUserMessages)[0]).toEqual(
      expect.objectContaining({ status: "failed", error }),
    );
    expect(promptAsync).toHaveBeenCalledWith(
      {
        sessionID: "ses_1",
        parts: [{ type: "text", text: "hello" }],
      },
      { throwOnError: true },
    );
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

  it("normalizes permission requests missing the always list", () => {
    const eventSource = createEventSource();
    const controller = new OpenCodeThreadController(
      {} as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());

    eventSource.emit({
      type: "permission.asked",
      sessionId: "ses_1",
      properties: {
        id: "permission_1",
        sessionID: "ses_1",
        permission: "bash",
        patterns: [],
        metadata: {},
        tool: { messageID: "assistant-1", callID: "call-1" },
      },
      raw: {},
    });

    expect(
      controller.getState().interactions.permissions.pending["permission_1"],
    ).toMatchObject({ id: "permission_1", always: [] });
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

  it("inspects only the updated part during live child-session sync", async () => {
    getOpenCodeTaskSessionIdSpy.mockClear();
    const eventSource = createEventSource();
    const message = {
      ...createTaskMessage("ses_parent", "parent-assistant", []),
      parts: Array.from({ length: 50 }, (_, index) => ({
        id: `parent-text-${index}`,
        sessionID: "ses_parent",
        messageID: "parent-assistant",
        type: "text",
        text: `Part ${index}`,
      })),
    };
    const client = {
      session: {
        get: vi.fn().mockResolvedValue({
          data: { id: "ses_parent", title: "Parent", time: {} },
        }),
        messages: vi.fn().mockResolvedValue({ data: [message] }),
      },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_parent",
    );
    const unsubscribe = controller.subscribe(vi.fn());

    await controller.load();
    const inspectionsAfterLoad = getOpenCodeTaskSessionIdSpy.mock.calls.length;

    eventSource.emit({
      type: "message.part.updated",
      sessionId: "ses_parent",
      properties: {
        part: {
          ...message.parts[0],
          text: "Updated",
        },
      },
      raw: {},
    });

    expect(getOpenCodeTaskSessionIdSpy).toHaveBeenCalledTimes(
      inspectionsAfterLoad + 1,
    );

    unsubscribe();
  });

  it("defers child-session work until the parent has a listener", async () => {
    const eventSource = createEventSource();
    const messages = vi.fn(({ sessionID }: { sessionID: string }) =>
      Promise.resolve({
        data:
          sessionID === "ses_parent"
            ? [
                createTaskMessage("ses_parent", "parent-assistant", [
                  "ses_child",
                ]),
              ]
            : [],
      }),
    );
    const client = {
      session: {
        get: vi.fn(({ sessionID }: { sessionID: string }) =>
          Promise.resolve({
            data: { id: sessionID, title: sessionID, time: {} },
          }),
        ),
        messages,
      },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_parent",
    );

    await controller.load();

    expect(messages).toHaveBeenCalledTimes(1);
    expect(eventSource.subscribe).not.toHaveBeenCalled();
    expect(
      controller.getState().childSessionsById.ses_child?.loadState.type,
    ).toBe("idle");

    const unsubscribe = controller.subscribe(vi.fn());

    await vi.waitFor(() => {
      expect(messages).toHaveBeenCalledTimes(2);
      expect(
        controller.getState().childSessionsById.ses_child?.loadState.type,
      ).toBe("ready");
    });
    expect(eventSource.subscribe).toHaveBeenCalledTimes(2);

    unsubscribe();

    expect(eventSource.unsubscribe).toHaveBeenCalledTimes(2);
  });

  it("keeps the global reconnect probes on the root session", async () => {
    const eventSource = createEventSource();
    const status = vi.fn().mockResolvedValue({ data: {} });
    const permissions = vi.fn().mockResolvedValue({ data: [] });
    const questions = vi.fn().mockResolvedValue({ data: [] });
    const sessionMessages = vi.fn(({ sessionID }: { sessionID: string }) =>
      Promise.resolve({
        data:
          sessionID === "ses_parent"
            ? [
                createTaskMessage("ses_parent", "parent-assistant", [
                  "ses_child",
                ]),
              ]
            : [],
      }),
    );
    const client = {
      session: {
        get: vi.fn(({ sessionID }: { sessionID: string }) =>
          Promise.resolve({
            data: { id: sessionID, title: sessionID, time: {} },
          }),
        ),
        messages: sessionMessages,
        status,
      },
      permission: { list: permissions },
      question: { list: questions },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_parent",
    );
    controller.subscribe(vi.fn());

    await controller.load();
    await vi.waitFor(() => {
      expect(
        controller.getState().childSessionsById.ses_child?.loadState.type,
      ).toBe("ready");
    });
    const callsBeforeReconnect = sessionMessages.mock.calls.length;

    eventSource.emit(streamReconnected);

    await vi.waitFor(() => {
      expect(sessionMessages.mock.calls.length).toBeGreaterThan(
        callsBeforeReconnect + 1,
      );
    });

    expect(status).toHaveBeenCalledTimes(1);
    expect(permissions).toHaveBeenCalledTimes(1);
    expect(questions).toHaveBeenCalledTimes(1);
  });

  it("does not refetch a loaded child when the parent re-attaches", async () => {
    const eventSource = createEventSource();
    const messages = vi.fn(({ sessionID }: { sessionID: string }) =>
      Promise.resolve({
        data:
          sessionID === "ses_parent"
            ? [
                createTaskMessage("ses_parent", "parent-assistant", [
                  "ses_child",
                ]),
              ]
            : [],
      }),
    );
    const client = {
      session: {
        get: vi.fn(({ sessionID }: { sessionID: string }) =>
          Promise.resolve({
            data: { id: sessionID, title: sessionID, time: {} },
          }),
        ),
        messages,
      },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_parent",
    );

    await controller.load();
    const unsubscribe = controller.subscribe(vi.fn());
    await vi.waitFor(() => {
      expect(
        controller.getState().childSessionsById.ses_child?.loadState.type,
      ).toBe("ready");
    });

    const callsAfterFirstAttach = messages.mock.calls.length;

    unsubscribe();
    const resubscribe = controller.subscribe(vi.fn());

    expect(messages.mock.calls.length).toBe(callsAfterFirstAttach);
    expect(
      controller.getState().childSessionsById.ses_child?.loadState.type,
    ).toBe("ready");

    resubscribe();
  });

  it("reports a child discovered on a live thread as loading before its history resolves", async () => {
    const eventSource = createEventSource();
    let resolveChildMessages: ((value: unknown) => void) | undefined;
    const messages = vi.fn(({ sessionID }: { sessionID: string }) => {
      if (sessionID === "ses_parent") return Promise.resolve({ data: [] });
      return new Promise((resolve) => {
        resolveChildMessages = resolve;
      });
    });
    const client = {
      session: {
        get: vi.fn(({ sessionID }: { sessionID: string }) =>
          Promise.resolve({
            data: { id: sessionID, title: sessionID, time: {} },
          }),
        ),
        messages,
      },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_parent",
    );
    const unsubscribe = controller.subscribe(vi.fn());

    await controller.load();

    eventSource.emit({
      type: "message.updated",
      sessionId: "ses_parent",
      properties: {
        info: {
          id: "parent-assistant",
          role: "assistant",
          sessionID: "ses_parent",
          parentID: "parent-user",
          modelID: "model",
          providerID: "provider",
          mode: "primary",
          path: { cwd: "/", root: "/" },
          cost: 0,
          tokens: {
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: { created: 1 },
        },
      },
      raw: {},
    });
    eventSource.emit({
      type: "message.part.updated",
      sessionId: "ses_parent",
      properties: {
        part: {
          id: "parent-task",
          callID: "parent-call",
          sessionID: "ses_parent",
          messageID: "parent-assistant",
          type: "tool",
          tool: "task",
          state: {
            status: "running",
            input: { description: "Inspect" },
            metadata: { sessionId: "ses_child" },
            time: { start: 1 },
          },
        },
      },
      raw: {},
    });

    expect(
      controller.getState().childSessionsById.ses_child?.loadState.type,
    ).toBe("loading");

    resolveChildMessages?.({ data: [] });

    await vi.waitFor(() => {
      expect(
        controller.getState().childSessionsById.ses_child?.loadState.type,
      ).toBe("ready");
    });

    unsubscribe();
  });

  it("loads parallel and recursive Task child sessions without following ancestor cycles", async () => {
    const eventSource = createEventSource();
    const messagesBySessionId: Record<string, unknown[]> = {
      ses_parent: [
        createTaskMessage("ses_parent", "parent-assistant", [
          "ses_child_a",
          "ses_child_b",
        ]),
      ],
      ses_child_a: [
        createTaskMessage("ses_child_a", "child-a-assistant", [
          "ses_grandchild",
        ]),
      ],
      ses_child_b: [],
      ses_grandchild: [
        createTaskMessage("ses_grandchild", "grandchild-assistant", [
          "ses_parent",
        ]),
      ],
    };
    const client = {
      session: {
        get: vi.fn(({ sessionID }: { sessionID: string }) =>
          Promise.resolve({
            data: { id: sessionID, title: sessionID, time: {} },
          }),
        ),
        messages: vi.fn(({ sessionID }: { sessionID: string }) =>
          Promise.resolve({ data: messagesBySessionId[sessionID] ?? [] }),
        ),
      },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_parent",
    );
    const unsubscribe = controller.subscribe(vi.fn());

    await controller.load();

    await vi.waitFor(() => {
      expect(client.session.messages).toHaveBeenCalledTimes(4);
      expect(
        controller.getState().childSessionsById.ses_child_a?.childSessionsById
          .ses_grandchild?.loadState.type,
      ).toBe("ready");
    });
    expect(Object.keys(controller.getState().childSessionsById).sort()).toEqual(
      ["ses_child_a", "ses_child_b"],
    );
    expect(
      client.session.messages.mock.calls.map(([request]) => request.sessionID),
    ).toEqual(
      expect.arrayContaining([
        "ses_parent",
        "ses_child_a",
        "ses_child_b",
        "ses_grandchild",
      ]),
    );
    expect(
      controller.getState().childSessionsById.ses_child_a?.childSessionsById
        .ses_grandchild?.childSessionsById,
    ).toEqual({});
    expect(eventSource.subscribe).toHaveBeenCalledTimes(4);

    unsubscribe();

    expect(eventSource.unsubscribe).toHaveBeenCalledTimes(4);
  });

  it("routes live child-session events into the nested state", async () => {
    const eventSource = createEventSource();
    const client = {
      session: {
        get: vi.fn(({ sessionID }: { sessionID: string }) =>
          Promise.resolve({
            data: { id: sessionID, title: sessionID, time: {} },
          }),
        ),
        messages: vi.fn(({ sessionID }: { sessionID: string }) =>
          Promise.resolve({
            data:
              sessionID === "ses_parent"
                ? [
                    {
                      info: {
                        id: "parent-assistant",
                        role: "assistant",
                        sessionID: "ses_parent",
                        parentID: "parent-user",
                        modelID: "model",
                        providerID: "provider",
                        mode: "primary",
                        path: { cwd: "/", root: "/" },
                        cost: 0,
                        tokens: {
                          input: 0,
                          output: 0,
                          reasoning: 0,
                          cache: { read: 0, write: 0 },
                        },
                        time: { created: 1 },
                      },
                      parts: [
                        {
                          id: "parent-task",
                          callID: "parent-call",
                          sessionID: "ses_parent",
                          messageID: "parent-assistant",
                          type: "tool",
                          tool: "task",
                          state: {
                            status: "running",
                            input: { description: "Inspect" },
                            metadata: { sessionId: "ses_child" },
                            time: { start: 1 },
                          },
                        },
                      ],
                    },
                  ]
                : [],
          }),
        ),
      },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_parent",
    );
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);

    await controller.load();
    await vi.waitFor(() => {
      expect(
        controller.getState().childSessionsById.ses_child?.loadState.type,
      ).toBe("ready");
    });

    eventSource.emit({
      type: "message.updated",
      sessionId: "ses_child",
      properties: {
        info: {
          id: "child-assistant",
          role: "assistant",
          sessionID: "ses_child",
          parentID: "child-user",
          modelID: "model",
          providerID: "provider",
          mode: "subagent",
          path: { cwd: "/", root: "/" },
          cost: 0,
          tokens: {
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: { created: 2 },
        },
      },
      raw: {},
    });
    eventSource.emit({
      type: "message.part.updated",
      sessionId: "ses_child",
      properties: {
        part: {
          id: "child-text",
          sessionID: "ses_child",
          messageID: "child-assistant",
          type: "text",
          text: "Live child output",
        },
      },
      raw: {},
    });

    expect(
      controller.getState().childSessionsById.ses_child?.messagesById[
        "child-assistant"
      ]?.parts,
    ).toMatchObject([{ type: "text", text: "Live child output" }]);
    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });

  it("removes a child controller when its Task part is removed", async () => {
    const eventSource = createEventSource();
    const client = {
      session: {
        get: vi.fn(({ sessionID }: { sessionID: string }) =>
          Promise.resolve({
            data: { id: sessionID, title: sessionID, time: {} },
          }),
        ),
        messages: vi.fn(({ sessionID }: { sessionID: string }) =>
          Promise.resolve({
            data:
              sessionID === "ses_parent"
                ? [
                    {
                      info: {
                        id: "parent-assistant",
                        role: "assistant",
                        sessionID: "ses_parent",
                        parentID: "parent-user",
                        modelID: "model",
                        providerID: "provider",
                        mode: "primary",
                        path: { cwd: "/", root: "/" },
                        cost: 0,
                        tokens: {
                          input: 0,
                          output: 0,
                          reasoning: 0,
                          cache: { read: 0, write: 0 },
                        },
                        time: { created: 1 },
                      },
                      parts: [
                        {
                          id: "parent-task",
                          callID: "parent-call",
                          sessionID: "ses_parent",
                          messageID: "parent-assistant",
                          type: "tool",
                          tool: "task",
                          state: {
                            status: "running",
                            input: { description: "Inspect" },
                            metadata: { sessionId: "ses_child" },
                            time: { start: 1 },
                          },
                        },
                      ],
                    },
                  ]
                : [],
          }),
        ),
      },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_parent",
    );
    const unsubscribe = controller.subscribe(vi.fn());

    await controller.load();
    await vi.waitFor(() => {
      expect(
        controller.getState().childSessionsById.ses_child?.loadState.type,
      ).toBe("ready");
    });

    eventSource.emit({
      type: "message.part.removed",
      sessionId: "ses_parent",
      properties: {
        messageID: "parent-assistant",
        partID: "parent-task",
      },
      raw: {},
    });

    expect(controller.getState().childSessionsById).toEqual({});
    expect(eventSource.unsubscribe).toHaveBeenCalledTimes(1);

    unsubscribe();

    expect(eventSource.unsubscribe).toHaveBeenCalledTimes(2);
  });

  it("keeps a child controller while another Task part references it", async () => {
    const eventSource = createEventSource();
    const client = {
      session: {
        get: vi.fn(({ sessionID }: { sessionID: string }) =>
          Promise.resolve({
            data: { id: sessionID, title: sessionID, time: {} },
          }),
        ),
        messages: vi.fn(({ sessionID }: { sessionID: string }) =>
          Promise.resolve({
            data:
              sessionID === "ses_parent"
                ? [
                    createTaskMessage("ses_parent", "parent-assistant", [
                      "ses_child",
                      "ses_child",
                    ]),
                  ]
                : [],
          }),
        ),
      },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_parent",
    );
    const unsubscribe = controller.subscribe(vi.fn());

    await controller.load();
    await vi.waitFor(() => {
      expect(
        controller.getState().childSessionsById.ses_child?.loadState.type,
      ).toBe("ready");
    });

    eventSource.emit({
      type: "message.part.removed",
      sessionId: "ses_parent",
      properties: {
        messageID: "parent-assistant",
        partID: "parent-assistant-task-0",
      },
      raw: {},
    });

    expect(controller.getState().childSessionsById.ses_child).toBeDefined();
    expect(eventSource.unsubscribe).not.toHaveBeenCalled();

    eventSource.emit({
      type: "message.part.removed",
      sessionId: "ses_parent",
      properties: {
        messageID: "parent-assistant",
        partID: "parent-assistant-task-1",
      },
      raw: {},
    });

    expect(controller.getState().childSessionsById).toEqual({});
    expect(eventSource.unsubscribe).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it("does not attach descendants from a removed Task's in-flight history", async () => {
    const eventSource = createEventSource();
    const childMessages = createDeferred<{ data: unknown[] }>();
    const messages = vi.fn(({ sessionID }: { sessionID: string }) => {
      if (sessionID === "ses_parent") {
        return Promise.resolve({
          data: [
            createTaskMessage("ses_parent", "parent-assistant", ["ses_child"]),
          ],
        });
      }
      if (sessionID === "ses_child") return childMessages.promise;
      return Promise.resolve({ data: [] });
    });
    const client = {
      session: {
        get: vi.fn(({ sessionID }: { sessionID: string }) =>
          Promise.resolve({
            data: { id: sessionID, title: sessionID, time: {} },
          }),
        ),
        messages,
      },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_parent",
    );
    const unsubscribe = controller.subscribe(vi.fn());

    await controller.load();
    await vi.waitFor(() => {
      expect(messages).toHaveBeenCalledTimes(2);
      expect(eventSource.subscribe).toHaveBeenCalledTimes(2);
    });

    eventSource.emit({
      type: "message.part.removed",
      sessionId: "ses_parent",
      properties: {
        messageID: "parent-assistant",
        partID: "parent-assistant-task-0",
      },
      raw: {},
    });

    childMessages.resolve({
      data: [
        createTaskMessage("ses_child", "child-assistant", ["ses_grandchild"]),
      ],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(messages).toHaveBeenCalledTimes(2);
    expect(eventSource.subscribe).toHaveBeenCalledTimes(2);
    expect(eventSource.unsubscribe).toHaveBeenCalledTimes(1);

    unsubscribe();

    expect(eventSource.unsubscribe).toHaveBeenCalledTimes(2);
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

  it("keeps current state when reconnect probes fail via throwOnError", async () => {
    const eventSource = createEventSource();
    const status = rejectWhenThrowing(new Error("boom"));
    const permissions = rejectWhenThrowing(new Error("boom"));
    const questions = rejectWhenThrowing(new Error("boom"));
    const client = createReconnectClient({ status, permissions, questions });
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
      expect(status).toHaveBeenCalledWith(undefined, { throwOnError: true });
      expect(permissions).toHaveBeenCalledWith(undefined, {
        throwOnError: true,
      });
      expect(questions).toHaveBeenCalledWith(undefined, {
        throwOnError: true,
      });
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

    expect(client.question.reply).toHaveBeenCalledWith(
      {
        requestID: "question_1",
        answers: [["Yes"]],
      },
      { throwOnError: true },
    );
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

    expect(client.question.reject).toHaveBeenCalledWith(
      {
        requestID: "question_1",
      },
      { throwOnError: true },
    );
    expect(
      controller.getState().interactions.questions.rejected.question_1,
    ).toBeDefined();
    expect(
      controller.getState().interactions.questions.pending.question_1,
    ).toBeUndefined();
  });
});
