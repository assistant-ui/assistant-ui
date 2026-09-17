import { describe, it, expect, onTestFinished, vi } from "vitest";
import { OpenCodeThreadController } from "./OpenCodeThreadController";
import { STREAM_RECONNECTED_EVENT_TYPE } from "./OpenCodeEventSource";
import { rejectWhenThrowing } from "./testUtils";
import type {
  OpenCodeServerEvent,
  PermissionRequest,
  QuestionRequest,
} from "./types";

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
  get = vi
    .fn()
    .mockResolvedValue({ data: { id: "ses_1", title: "t", time: {} } }),
  messages = vi.fn().mockResolvedValue({ data: [] }),
  status = vi.fn().mockResolvedValue({ data: {} }),
  permissions = vi.fn().mockResolvedValue({ data: [] }),
  questions = vi.fn().mockResolvedValue({ data: [] }),
} = {}) => ({
  session: {
    get,
    messages,
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

  it.each([
    {
      label: "data url image keeps its declared type",
      image: "data:image/jpeg;base64,QUJD",
      mime: "image/jpeg",
      url: "data:image/jpeg;base64,QUJD",
    },
    {
      label: "bare base64 image is wrapped with the fallback type",
      image: "QUJD",
      mime: "image/png",
      url: "data:image/png;base64,QUJD",
    },
    {
      label: "http image source is forwarded",
      image: "https://cdn.example.com/a.png",
      mime: "image/png",
      url: "https://cdn.example.com/a.png",
    },
  ])(
    "sends an image part as a file part: $label",
    async ({ image, mime, url }) => {
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
          content: [{ type: "image", image }],
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
      const imagePart = sent.parts.find((part) => part["type"] === "file");
      expect(imagePart).toMatchObject({ type: "file", mime, url });
      expect(sent.parts.some((part) => part["type"] === "image")).toBe(false);
      expect(() => new URL(String(imagePart!["url"]))).not.toThrow();
    },
  );

  it.each([
    { label: "jpeg", image: "/9j/4AAQSkZJRg==", mime: "image/jpeg" },
    { label: "png", image: "iVBORw0KGgoAAAANSUhEUg==", mime: "image/png" },
    { label: "gif", image: "R0lGODlhAQABAA==", mime: "image/gif" },
    { label: "webp", image: "UklGRiIAAABXRUJQVlA4", mime: "image/webp" },
  ])("sniffs a bare base64 $label image", async ({ image, mime }) => {
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
        content: [{ type: "image", image }],
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
      mime,
      url: `data:${mime};base64,${image}`,
    });
  });

  it("reads the declared type of a non-base64 data url image", async () => {
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
          { type: "image", image: "data:image/svg+xml,%3Csvg%3E%3C/svg%3E" },
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
      mime: "image/svg+xml",
      url: "data:image/svg+xml,%3Csvg%3E%3C/svg%3E",
    });
  });

  it("sniffs through a generic data url envelope", async () => {
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
            type: "image",
            image: "data:application/octet-stream;base64,/9j/4AAQSkZJRg==",
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
      mime: "image/jpeg",
      url: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
    });
  });

  it("ignores a non-image data url envelope when typing an image part", async () => {
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
        content: [],
        attachments: [
          {
            id: "a-1",
            type: "image",
            name: "photo",
            contentType: "",
            status: { type: "complete" },
            content: [
              {
                type: "image",
                image: "data:application/octet-stream;base64,QUJD",
              },
            ],
          },
        ],
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
    // the envelope must agree with `mime`: downstream the data URL type wins.
    expect(sent.parts.find((part) => part["type"] === "file")).toMatchObject({
      mime: "image/png",
      url: "data:image/png;base64,QUJD",
    });
  });

  it("falls back to the envelope before the floor for an empty file mime type", async () => {
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
            data: "data:application/pdf;base64,QUJD",
            mimeType: "",
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
      mime: "application/pdf",
      url: "data:application/pdf;base64,QUJD",
    });
  });

  it("floors an empty file mime type", async () => {
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
        content: [{ type: "file", data: "QUJD", mimeType: "" }],
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
      mime: "application/octet-stream",
      url: "data:application/octet-stream;base64,QUJD",
    });
  });

  it("re-envelopes a file payload so the declared mime wins", async () => {
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
            data: "data:application/octet-stream;base64,QUJD",
            mimeType: "application/pdf",
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
      mime: "application/pdf",
      url: "data:application/pdf;base64,QUJD",
    });
  });

  it("names the pending message from the attachment rather than its payload", async () => {
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
        content: [],
        attachments: [
          {
            id: "a-1",
            type: "image",
            name: "photo.webp",
            contentType: "image/webp",
            status: { type: "complete" },
            content: [{ type: "image", image: "QUJD" }],
          },
        ],
        metadata: { custom: {} },
        runConfig: {},
        createdAt: new Date(),
      } as never,
      { model: { providerID: "anthropic", modelID: "claude" } },
    );

    const pending = Object.values(
      controller.getState().pendingUserMessages,
    )[0]!;
    expect(pending.contentText).toBe("photo.webp");
  });

  it("uses the attachment name and content type its parts do not carry", async () => {
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
        content: [],
        attachments: [
          {
            id: "a-1",
            type: "image",
            name: "photo.webp",
            contentType: "image/webp",
            status: { type: "complete" },
            content: [{ type: "image", image: "QUJD" }],
          },
        ],
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
      mime: "image/webp",
      filename: "photo.webp",
      url: "data:image/webp;base64,QUJD",
    });
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

  it("isolates subscriber errors while sending messages", async () => {
    const promptAsync = vi.fn().mockResolvedValue({});
    const controller = new OpenCodeThreadController(
      { session: { promptAsync } } as never,
      () => ({ subscribe: () => () => {} }),
      "ses_1",
    );
    const listenerError = new Error("listener failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    onTestFinished(() => consoleError.mockRestore());
    const laterListener = vi.fn();

    controller.subscribe(() => {
      throw listenerError;
    });
    controller.subscribe(laterListener);

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
    ).resolves.toBeUndefined();

    expect(promptAsync).toHaveBeenCalledOnce();
    expect(laterListener).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "[react-opencode] Listener threw an error",
      listenerError,
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

  it("keeps the active run when a background history refresh fails", async () => {
    const eventSource = createEventSource();
    const get = vi.fn().mockRejectedValue(new Error("history unavailable"));
    const client = createReconnectClient({ get });
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
    eventSource.emit({
      type: "session.compacted",
      sessionId: "ses_1",
      properties: {},
      raw: {},
    });

    await vi.waitFor(() => expect(get).toHaveBeenCalledOnce());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(controller.getState().loadState).toMatchObject({ type: "error" });
    expect(controller.getState().runState).toMatchObject({ type: "streaming" });
  });

  it("coalesces background history refreshes", async () => {
    const eventSource = createEventSource();
    const firstSession = createDeferred<{ data: unknown }>();
    const firstMessages = createDeferred<{ data: unknown[] }>();
    const secondSession = createDeferred<{ data: unknown }>();
    const secondMessages = createDeferred<{ data: unknown[] }>();
    const get = vi
      .fn()
      .mockReturnValueOnce(firstSession.promise)
      .mockReturnValueOnce(secondSession.promise);
    const listMessages = vi
      .fn()
      .mockReturnValueOnce(firstMessages.promise)
      .mockReturnValueOnce(secondMessages.promise);
    const client = createReconnectClient({
      get,
      messages: listMessages,
    });
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());

    const compacted: OpenCodeServerEvent = {
      type: "session.compacted",
      sessionId: "ses_1",
      properties: {},
      raw: {},
    };
    eventSource.emit(compacted);
    eventSource.emit(compacted);

    expect(get).toHaveBeenCalledOnce();
    expect(listMessages).toHaveBeenCalledOnce();

    firstSession.resolve({ data: { id: "stale_session", time: {} } });
    firstMessages.resolve({ data: [] });
    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(listMessages).toHaveBeenCalledTimes(2);
    expect(controller.getState().loadState).toMatchObject({ type: "loading" });
    expect(controller.getState().session).toBeNull();

    secondSession.resolve({ data: { id: "fresh_session", time: {} } });
    secondMessages.resolve({ data: [] });
    await vi.waitFor(() =>
      expect(controller.getState().loadState).toMatchObject({ type: "ready" }),
    );
    expect(controller.getState().session).toMatchObject({
      id: "fresh_session",
    });
  });

  it("uses an explicit refresh to satisfy a queued background refresh", async () => {
    const eventSource = createEventSource();
    const firstSession = createDeferred<{ data: unknown }>();
    const firstMessages = createDeferred<{ data: unknown[] }>();
    const secondSession = createDeferred<{ data: unknown }>();
    const secondMessages = createDeferred<{ data: unknown[] }>();
    const get = vi
      .fn()
      .mockReturnValueOnce(firstSession.promise)
      .mockReturnValueOnce(secondSession.promise);
    const listMessages = vi
      .fn()
      .mockReturnValueOnce(firstMessages.promise)
      .mockReturnValueOnce(secondMessages.promise);
    const controller = new OpenCodeThreadController(
      createReconnectClient({ get, messages: listMessages }) as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());

    const compacted: OpenCodeServerEvent = {
      type: "session.compacted",
      sessionId: "ses_1",
      properties: {},
      raw: {},
    };
    eventSource.emit(compacted);
    eventSource.emit(compacted);
    const refresh = controller.refresh();

    firstSession.resolve({ data: { id: "stale_session", time: {} } });
    firstMessages.resolve({ data: [] });
    secondSession.resolve({ data: { id: "fresh_session", time: {} } });
    secondMessages.resolve({ data: [] });
    await refresh;

    expect(get).toHaveBeenCalledTimes(2);
    expect(listMessages).toHaveBeenCalledTimes(2);
    expect(controller.getState().loadState).toMatchObject({ type: "ready" });
    expect(controller.getState().session).toMatchObject({
      id: "fresh_session",
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

  it("does not restore a permission answered while reconnect recovery is pending", async () => {
    const eventSource = createEventSource();
    const permissions = createDeferred<{ data: PermissionRequest[] }>();
    const request = {
      id: "perm_1",
      sessionID: "ses_1",
      permission: "fs.write",
      metadata: {},
    } as PermissionRequest;
    const client = createReconnectClient({
      permissions: vi.fn(() => permissions.promise),
    });
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());
    eventSource.emit({
      type: "permission.asked",
      sessionId: "ses_1",
      properties: request,
      raw: {},
    });

    eventSource.emit(streamReconnected);
    eventSource.emit({
      type: "permission.replied",
      sessionId: "ses_1",
      properties: { requestID: "perm_1", reply: "once" },
      raw: {},
    });
    permissions.resolve({ data: [request] });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(
      controller.getState().interactions.permissions.pending.perm_1,
    ).toBeUndefined();
  });

  it("does not restore a question answered while reconnect recovery is pending", async () => {
    const eventSource = createEventSource();
    const questions = createDeferred<{ data: QuestionRequest[] }>();
    const request = {
      id: "q_1",
      sessionID: "ses_1",
      questions: [],
    } as QuestionRequest;
    const client = createReconnectClient({
      questions: vi.fn(() => questions.promise),
    });
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());
    eventSource.emit({
      type: "question.asked",
      sessionId: "ses_1",
      properties: request,
      raw: {},
    });

    eventSource.emit(streamReconnected);
    eventSource.emit({
      type: "question.replied",
      sessionId: "ses_1",
      properties: { requestID: "q_1", answers: [] },
      raw: {},
    });
    questions.resolve({ data: [request] });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(
      controller.getState().interactions.questions.pending.q_1,
    ).toBeUndefined();
  });

  it.each(["permission", "question"] as const)(
    "does not restore a $kind after a malformed terminal event during recovery",
    async (kind) => {
      const eventSource = createEventSource();
      const list = createDeferred<{ data: unknown[] }>();
      const isPermission = kind === "permission";
      const request = isPermission
        ? {
            id: "perm_1",
            sessionID: "ses_1",
            permission: "fs.write",
            metadata: {},
          }
        : { id: "q_1", sessionID: "ses_1", questions: [] };
      const client = createReconnectClient(
        isPermission
          ? { permissions: vi.fn(() => list.promise) }
          : { questions: vi.fn(() => list.promise) },
      );
      const controller = new OpenCodeThreadController(
        client as never,
        () => eventSource,
        "ses_1",
      );
      controller.subscribe(vi.fn());
      eventSource.emit({
        type: isPermission ? "permission.asked" : "question.asked",
        sessionId: "ses_1",
        properties: request,
        raw: {},
      } as never);

      eventSource.emit(streamReconnected);
      eventSource.emit({
        type: isPermission ? "permission.replied" : "question.replied",
        sessionId: "ses_1",
        properties: isPermission
          ? { requestID: request.id, reply: "unsupported" }
          : { requestID: request.id, answers: null },
        raw: {},
      } as never);
      list.resolve({ data: [request] });
      await new Promise((resolve) => setTimeout(resolve, 0));

      const pending = isPermission
        ? controller.getState().interactions.permissions.pending
        : controller.getState().interactions.questions.pending;
      expect(pending[request.id]).toBeUndefined();
    },
  );

  it.each(["permission", "question"] as const)(
    "keeps a pending $kind when reconnect recovery has no array body",
    async (kind) => {
      const eventSource = createEventSource();
      const list = createDeferred<{ data: unknown }>();
      const isPermission = kind === "permission";
      const request = isPermission
        ? {
            id: "perm_1",
            sessionID: "ses_1",
            permission: "fs.write",
            metadata: {},
          }
        : { id: "q_1", sessionID: "ses_1", questions: [] };
      const client = createReconnectClient(
        isPermission
          ? { permissions: vi.fn(() => list.promise) }
          : { questions: vi.fn(() => list.promise) },
      );
      const controller = new OpenCodeThreadController(
        client as never,
        () => eventSource,
        "ses_1",
      );
      controller.subscribe(vi.fn());
      eventSource.emit({
        type: isPermission ? "permission.asked" : "question.asked",
        sessionId: "ses_1",
        properties: request,
        raw: {},
      } as never);

      eventSource.emit(streamReconnected);
      list.resolve({ data: undefined });
      await new Promise((resolve) => setTimeout(resolve, 0));

      const pending = isPermission
        ? controller.getState().interactions.permissions.pending
        : controller.getState().interactions.questions.pending;
      expect(pending[request.id]).toBeDefined();
    },
  );

  it.each([
    { kind: "permission", id: "perm_1" },
    { kind: "question", id: "q_1" },
    { kind: "reject", id: "q_2" },
  ] as const)(
    "does not restore a missed $kind ask settled by a live event",
    async ({ kind, id }) => {
      const eventSource = createEventSource();
      const list = createDeferred<{ data: unknown[] }>();
      const isPermission = kind === "permission";
      const request = isPermission
        ? {
            id,
            sessionID: "ses_1",
            permission: "fs.write",
            metadata: {},
          }
        : { id, sessionID: "ses_1", questions: [] };
      const client = createReconnectClient(
        isPermission
          ? { permissions: vi.fn(() => list.promise) }
          : { questions: vi.fn(() => list.promise) },
      );
      const controller = new OpenCodeThreadController(
        client as never,
        () => eventSource,
        "ses_1",
      );
      controller.subscribe(vi.fn());

      eventSource.emit(streamReconnected);
      await vi.waitFor(() =>
        expect(
          isPermission ? client.permission.list : client.question.list,
        ).toHaveBeenCalled(),
      );
      eventSource.emit(
        (kind === "permission"
          ? {
              type: "permission.replied",
              sessionId: "ses_1",
              properties: { requestID: id, reply: "once" },
              raw: {},
            }
          : kind === "question"
            ? {
                type: "question.replied",
                sessionId: "ses_1",
                properties: { requestID: id, answers: [] },
                raw: {},
              }
            : {
                type: "question.rejected",
                sessionId: "ses_1",
                properties: { requestID: id },
                raw: {},
              }) as never,
      );

      list.resolve({ data: [request] });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(
        isPermission
          ? controller.getState().interactions.permissions.pending[id]
          : controller.getState().interactions.questions.pending[id],
      ).toBeUndefined();
    },
  );

  it.each(["permission", "question"] as const)(
    "preserves an unchanged $kind request during recovery",
    async (kind) => {
      const eventSource = createEventSource();
      const isPermission = kind === "permission";
      const request = isPermission
        ? {
            id: "perm_1",
            sessionID: "ses_1",
            permission: "fs.write",
            metadata: {},
          }
        : { id: "q_1", sessionID: "ses_1", questions: [] };
      const client = createReconnectClient(
        isPermission
          ? { permissions: vi.fn().mockResolvedValue({ data: [request] }) }
          : { questions: vi.fn().mockResolvedValue({ data: [request] }) },
      );
      const controller = new OpenCodeThreadController(
        client as never,
        () => eventSource,
        "ses_1",
      );
      controller.subscribe(vi.fn());
      eventSource.emit({
        type: isPermission ? "permission.asked" : "question.asked",
        sessionId: "ses_1",
        properties: request,
        raw: {},
      } as never);
      const before = isPermission
        ? controller.getState().interactions.permissions.pending[request.id]
        : controller.getState().interactions.questions.pending[request.id];

      eventSource.emit(streamReconnected);
      await vi.waitFor(() =>
        expect(
          isPermission ? client.permission.list : client.question.list,
        ).toHaveBeenCalled(),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));

      const after = isPermission
        ? controller.getState().interactions.permissions.pending[request.id]
        : controller.getState().interactions.questions.pending[request.id];
      expect(after).toBe(before);
    },
  );

  it.each([
    { kind: "permission", id: "perm_1" },
    { kind: "question", id: "q_1" },
    { kind: "reject", id: "q_2" },
  ] as const)(
    "does not restore a $kind settled through the controller during recovery",
    async ({ kind, id }) => {
      const eventSource = createEventSource();
      const list = createDeferred<{ data: unknown[] }>();
      const isPermission = kind === "permission";
      const base = createReconnectClient(
        isPermission
          ? { permissions: vi.fn(() => list.promise) }
          : { questions: vi.fn(() => list.promise) },
      );
      const client = {
        ...base,
        permission: {
          ...base.permission,
          reply: vi.fn().mockResolvedValue({ data: {} }),
        },
        question: {
          ...base.question,
          reply: vi.fn().mockResolvedValue({ data: {} }),
          reject: vi.fn().mockResolvedValue({ data: {} }),
        },
      };
      const controller = new OpenCodeThreadController(
        client as never,
        () => eventSource,
        "ses_1",
      );
      controller.subscribe(vi.fn());
      const request = isPermission
        ? {
            id,
            sessionID: "ses_1",
            permission: "fs.write",
            metadata: {},
          }
        : { id, sessionID: "ses_1", questions: [] };
      eventSource.emit({
        type: isPermission ? "permission.asked" : "question.asked",
        sessionId: "ses_1",
        properties: request,
        raw: {},
      } as never);

      eventSource.emit(streamReconnected);
      await vi.waitFor(() =>
        expect(
          isPermission ? client.permission.list : client.question.list,
        ).toHaveBeenCalled(),
      );

      if (kind === "permission") {
        await controller.replyToPermission(id, "once" as never);
      } else if (kind === "question") {
        await controller.replyToQuestion(id, [] as never);
      } else {
        await controller.rejectQuestion(id);
      }

      list.resolve({ data: [request] });
      await new Promise((resolve) => setTimeout(resolve, 0));

      const pending = isPermission
        ? controller.getState().interactions.permissions.pending
        : controller.getState().interactions.questions.pending;
      expect(pending[id]).toBeUndefined();
    },
  );
  it("removes a permission settled while the event stream was disconnected", async () => {
    const eventSource = createEventSource();
    const client = createReconnectClient();
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());
    eventSource.emit({
      type: "permission.asked",
      sessionId: "ses_1",
      properties: {
        id: "perm_1",
        sessionID: "ses_1",
        permission: "fs.write",
        metadata: {},
      },
      raw: {},
    });

    eventSource.emit(streamReconnected);

    await vi.waitFor(() => {
      expect(
        controller.getState().interactions.permissions.pending.perm_1,
      ).toBeUndefined();
    });
  });

  it.each([
    { kind: "permission", id: "perm_1", snapshotFirst: true },
    { kind: "question", id: "q_1", snapshotFirst: true },
    { kind: "reject", id: "q_2", snapshotFirst: true },
    { kind: "permission", id: "perm_1", snapshotFirst: false },
    { kind: "question", id: "q_1", snapshotFirst: false },
    { kind: "reject", id: "q_2", snapshotFirst: false },
  ] as const)(
    "keeps a $kind answer when snapshotFirst is $snapshotFirst",
    async ({ kind, id, snapshotFirst }) => {
      const eventSource = createEventSource();
      const list = createDeferred<{ data: unknown[] }>();
      const answer = createDeferred<unknown>();
      const isPermission = kind === "permission";
      const base = createReconnectClient(
        isPermission
          ? { permissions: vi.fn().mockReturnValue(list.promise) }
          : { questions: vi.fn().mockReturnValue(list.promise) },
      );
      const client = {
        ...base,
        permission: {
          ...base.permission,
          reply: vi.fn().mockReturnValue(answer.promise),
        },
        question: {
          ...base.question,
          reply: vi.fn().mockReturnValue(answer.promise),
          reject: vi.fn().mockReturnValue(answer.promise),
        },
      };
      const controller = new OpenCodeThreadController(
        client as never,
        () => eventSource,
        "ses_1",
      );
      controller.subscribe(vi.fn());

      const request = isPermission
        ? {
            id,
            sessionID: "ses_1",
            permission: "fs.write",
            metadata: {},
          }
        : { id, sessionID: "ses_1", questions: [] };
      eventSource.emit({
        type: isPermission ? "permission.asked" : "question.asked",
        sessionId: "ses_1",
        properties: request,
        raw: {},
      } as never);

      eventSource.emit(streamReconnected);
      await vi.waitFor(() =>
        expect(
          isPermission ? client.permission.list : client.question.list,
        ).toHaveBeenCalled(),
      );

      // The user answers while the snapshot request is still in flight.
      const answering =
        kind === "permission"
          ? controller.replyToPermission(id, "once" as never)
          : kind === "question"
            ? controller.replyToQuestion(id, [] as never)
            : controller.rejectQuestion(id);

      if (snapshotFirst) {
        list.resolve({ data: [] });
        await new Promise((resolve) => setTimeout(resolve, 0));
        answer.resolve({ data: {} });
        await answering;
      } else {
        answer.resolve({ data: {} });
        await answering;
        list.resolve({ data: [request] });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const interactions = controller.getState().interactions;
      const settled =
        kind === "permission"
          ? interactions.permissions.resolved
          : kind === "question"
            ? interactions.questions.answered
            : interactions.questions.rejected;
      expect(settled[id]).toBeDefined();
      const pending = isPermission
        ? interactions.permissions.pending
        : interactions.questions.pending;
      expect(pending[id]).toBeUndefined();
    },
  );

  it("keeps an in-flight permission across question recovery", async () => {
    const eventSource = createEventSource();
    const permissions = createDeferred<{ data: PermissionRequest[] }>();
    const answer = createDeferred<unknown>();
    const base = createReconnectClient({
      permissions: vi.fn(() => permissions.promise),
    });
    const client = {
      ...base,
      permission: {
        ...base.permission,
        reply: vi.fn(() => answer.promise),
      },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());
    eventSource.emit({
      type: "permission.asked",
      sessionId: "ses_1",
      properties: {
        id: "perm_1",
        sessionID: "ses_1",
        permission: "fs.write",
        metadata: {},
      },
      raw: {},
    });

    const replying = controller.replyToPermission("perm_1", "once" as never);
    eventSource.emit({
      type: "question.asked",
      sessionId: "ses_1",
      properties: {
        id: "q_1",
        sessionID: "ses_1",
        questions: [],
      },
      raw: {},
    });
    eventSource.emit(streamReconnected);
    await vi.waitFor(() => expect(client.permission.list).toHaveBeenCalled());

    permissions.resolve({ data: [] });
    await permissions.promise;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      controller.getState().interactions.permissions.pending.perm_1,
    ).toBeDefined();

    answer.resolve({ data: {} });
    await replying;
    expect(
      controller.getState().interactions.permissions.resolved.perm_1,
    ).toBeDefined();
  });

  it.each([
    { kind: "permission", id: "perm_1" },
    { kind: "question", id: "q_1" },
    { kind: "reject", id: "q_2" },
  ] as const)(
    "does not re-add a $kind the user answered before the snapshot lands",
    async ({ kind, id }) => {
      const eventSource = createEventSource();
      const list = createDeferred<{ data: unknown[] }>();
      const isPermission = kind === "permission";
      const base = createReconnectClient(
        isPermission
          ? { permissions: vi.fn().mockReturnValue(list.promise) }
          : { questions: vi.fn().mockReturnValue(list.promise) },
      );
      const client = {
        ...base,
        permission: {
          ...base.permission,
          reply: vi.fn().mockResolvedValue({ data: {} }),
        },
        question: {
          ...base.question,
          reply: vi.fn().mockResolvedValue({ data: {} }),
          reject: vi.fn().mockResolvedValue({ data: {} }),
        },
      };
      const controller = new OpenCodeThreadController(
        client as never,
        () => eventSource,
        "ses_1",
      );
      controller.subscribe(vi.fn());

      const snapshotItem = isPermission
        ? { id, sessionID: "ses_1", permission: "fs.write", metadata: {} }
        : { id, sessionID: "ses_1", questions: [] };
      eventSource.emit(
        (isPermission
          ? {
              type: "permission.asked",
              sessionId: "ses_1",
              properties: snapshotItem,
              raw: {},
            }
          : {
              type: "question.asked",
              sessionId: "ses_1",
              properties: snapshotItem,
              raw: {},
            }) as never,
      );

      eventSource.emit(streamReconnected);
      await vi.waitFor(() =>
        expect(
          isPermission ? client.permission.list : client.question.list,
        ).toHaveBeenCalled(),
      );

      if (kind === "permission") {
        await controller.replyToPermission(id, "once" as never);
      } else if (kind === "question") {
        await controller.replyToQuestion(id, [] as never);
      } else {
        await controller.rejectQuestion(id);
      }

      const settledOf = () => {
        const interactions = controller.getState().interactions;
        return kind === "permission"
          ? interactions.permissions.resolved
          : kind === "question"
            ? interactions.questions.answered
            : interactions.questions.rejected;
      };
      expect(settledOf()[id]).toBeDefined();

      // The snapshot was taken before the answer reached the server, so it
      // still lists the request. It must not resurrect an answered one.
      list.resolve({ data: [snapshotItem] });
      await list.promise;
      await vi.waitFor(() => expect(client.session.get).toHaveBeenCalled());

      expect(settledOf()[id]).toBeDefined();
      const interactions = controller.getState().interactions;
      const pending = isPermission
        ? interactions.permissions.pending
        : interactions.questions.pending;
      expect(pending[id]).toBeUndefined();
    },
  );

  it("keeps the second of two overlapping replies for one request", async () => {
    const eventSource = createEventSource();
    const list = createDeferred<{ data: unknown[] }>();
    const firstReply = createDeferred<unknown>();
    const secondReply = createDeferred<unknown>();
    const reply = vi
      .fn()
      .mockReturnValueOnce(firstReply.promise)
      .mockReturnValueOnce(secondReply.promise);
    const base = createReconnectClient({
      permissions: vi.fn().mockReturnValue(list.promise),
    });
    const client = {
      ...base,
      permission: { ...base.permission, reply },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());
    eventSource.emit({
      type: "permission.asked",
      sessionId: "ses_1",
      properties: {
        id: "perm_1",
        sessionID: "ses_1",
        permission: "fs.write",
        metadata: {},
      },
      raw: {},
    });

    eventSource.emit(streamReconnected);
    await vi.waitFor(() => expect(client.permission.list).toHaveBeenCalled());

    const first = controller
      .replyToPermission("perm_1", "once" as never)
      .catch(() => {});
    const second = controller.replyToPermission("perm_1", "once" as never);

    // The first attempt fails while the second is still in flight, so the
    // shared marker must not be cleared yet.
    firstReply.reject(new Error("network down"));
    await first;

    list.resolve({ data: [] });
    await list.promise;

    secondReply.resolve({ data: {} });
    await second;

    expect(
      controller.getState().interactions.permissions.resolved["perm_1"],
    ).toBeDefined();
  });

  it("removes a question settled while the event stream was disconnected", async () => {
    const eventSource = createEventSource();
    const client = createReconnectClient();
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());
    eventSource.emit({
      type: "question.asked",
      sessionId: "ses_1",
      properties: { id: "q_1", sessionID: "ses_1", questions: [] },
      raw: {},
    });

    eventSource.emit(streamReconnected);

    await vi.waitFor(() => {
      expect(
        controller.getState().interactions.questions.pending.q_1,
      ).toBeUndefined();
    });
  });

  it.each([
    { kind: "permission", id: "perm_1" },
    { kind: "question", id: "q_1" },
    { kind: "reject", id: "q_2" },
  ] as const)(
    "does not restore a $kind while an overlapping reply remains in flight",
    async ({ kind, id }) => {
      const eventSource = createEventSource();
      const list = createDeferred<{ data: unknown[] }>();
      const firstReply = createDeferred<unknown>();
      const secondReply = createDeferred<unknown>();
      const reply = vi
        .fn()
        .mockReturnValueOnce(firstReply.promise)
        .mockReturnValueOnce(secondReply.promise);
      const isPermission = kind === "permission";
      const base = createReconnectClient(
        isPermission
          ? { permissions: vi.fn(() => list.promise) }
          : { questions: vi.fn(() => list.promise) },
      );
      const client = {
        ...base,
        permission: {
          ...base.permission,
          reply: isPermission ? reply : vi.fn(),
        },
        question: {
          ...base.question,
          reply: kind === "question" ? reply : vi.fn(),
          reject: kind === "reject" ? reply : vi.fn(),
        },
      };
      const controller = new OpenCodeThreadController(
        client as never,
        () => eventSource,
        "ses_1",
      );
      controller.subscribe(vi.fn());
      const request = isPermission
        ? {
            id,
            sessionID: "ses_1",
            permission: "fs.write",
            metadata: {},
          }
        : { id, sessionID: "ses_1", questions: [] };
      eventSource.emit({
        type: isPermission ? "permission.asked" : "question.asked",
        sessionId: "ses_1",
        properties: request,
        raw: {},
      } as never);

      const first =
        kind === "permission"
          ? controller.replyToPermission(id, "once" as never)
          : kind === "question"
            ? controller.replyToQuestion(id, [] as never)
            : controller.rejectQuestion(id);
      const second =
        kind === "permission"
          ? controller.replyToPermission(id, "once" as never)
          : kind === "question"
            ? controller.replyToQuestion(id, [] as never)
            : controller.rejectQuestion(id);

      firstReply.resolve({ data: {} });
      await first;

      eventSource.emit(streamReconnected);
      await vi.waitFor(() =>
        expect(
          isPermission ? client.permission.list : client.question.list,
        ).toHaveBeenCalled(),
      );

      list.resolve({ data: [request] });
      await list.promise;
      await new Promise((resolve) => setTimeout(resolve, 0));

      secondReply.reject(new Error("network down"));
      await expect(second).rejects.toThrow("network down");

      const interactions = controller.getState().interactions;
      const settled =
        kind === "permission"
          ? interactions.permissions.resolved
          : kind === "question"
            ? interactions.questions.answered
            : interactions.questions.rejected;
      const pending = isPermission
        ? interactions.permissions.pending
        : interactions.questions.pending;
      expect(settled[id]).toBeDefined();
      expect(pending[id]).toBeUndefined();
    },
  );

  it.each([
    { kind: "permission", id: "perm_1" },
    { kind: "question", id: "q_1" },
    { kind: "reject", id: "q_2" },
  ] as const)(
    "does not let a stale $kind completion settle a reused request ID",
    async ({ kind, id }) => {
      const eventSource = createEventSource();
      const completion = createDeferred<unknown>();
      const complete = vi.fn(() => completion.promise);
      const base = createReconnectClient();
      const client = {
        ...base,
        permission: {
          ...base.permission,
          reply: kind === "permission" ? complete : vi.fn(),
        },
        question: {
          ...base.question,
          reply: kind === "question" ? complete : vi.fn(),
          reject: kind === "reject" ? complete : vi.fn(),
        },
      };
      const controller = new OpenCodeThreadController(
        client as never,
        () => eventSource,
        "ses_1",
      );
      controller.subscribe(vi.fn());
      const isPermission = kind === "permission";
      const initialRequest = isPermission
        ? {
            id,
            sessionID: "ses_1",
            permission: "fs.read",
            metadata: {},
          }
        : { id, sessionID: "ses_1", questions: [] };
      const newerRequest = isPermission
        ? {
            id,
            sessionID: "ses_1",
            permission: "fs.write",
            metadata: {},
          }
        : {
            id,
            sessionID: "ses_1",
            questions: [{ header: "New", question: "Continue?", options: [] }],
          };
      const emitRequest = (request: typeof initialRequest) =>
        eventSource.emit({
          type: isPermission ? "permission.asked" : "question.asked",
          sessionId: "ses_1",
          properties: request,
          raw: {},
        } as never);
      emitRequest(initialRequest);

      const settling =
        kind === "permission"
          ? controller.replyToPermission(id, "once" as never)
          : kind === "question"
            ? controller.replyToQuestion(id, [] as never)
            : controller.rejectQuestion(id);
      emitRequest(newerRequest as typeof initialRequest);

      completion.resolve({ data: {} });
      await settling;

      const interactions = controller.getState().interactions;
      const pending = isPermission
        ? interactions.permissions.pending[id]
        : interactions.questions.pending[id];
      if (isPermission) {
        expect(pending).toMatchObject({ permission: "fs.write" });
      } else {
        expect(pending).toMatchObject({
          questions: [{ header: "New", question: "Continue?", options: [] }],
        });
      }
      const settled =
        kind === "permission"
          ? interactions.permissions.resolved
          : kind === "question"
            ? interactions.questions.answered
            : interactions.questions.rejected;
      expect(settled[id]).toBeUndefined();
    },
  );

  it("still settles a reply when an unrelated permission is asked mid-flight", async () => {
    const eventSource = createEventSource();
    const firstReply = createDeferred<unknown>();
    const secondReply = createDeferred<unknown>();
    const reply = vi
      .fn()
      .mockReturnValueOnce(firstReply.promise)
      .mockReturnValueOnce(secondReply.promise);
    const base = createReconnectClient();
    const client = { ...base, permission: { ...base.permission, reply } };
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());
    const ask = (id: string) =>
      eventSource.emit({
        type: "permission.asked",
        sessionId: "ses_1",
        properties: {
          id,
          sessionID: "ses_1",
          permission: "fs.write",
          metadata: {},
        },
        raw: {},
      });

    ask("perm_1");
    const first = controller.replyToPermission("perm_1", "once" as never);

    ask("perm_2");
    const second = controller
      .replyToPermission("perm_1", "once" as never)
      .catch(() => {});

    firstReply.resolve({ data: {} });
    await first;

    expect(
      controller.getState().interactions.permissions.resolved["perm_1"],
    ).toBeDefined();

    secondReply.reject(new Error("network down"));
    await second;
  });
  it.each([
    { kind: "permission", id: "perm_1" },
    { kind: "question", id: "q_1" },
    { kind: "reject", id: "q_2" },
  ] as const)(
    "recovers a reused $kind ID when the new request predates recovery",
    async ({ kind, id }) => {
      const eventSource = createEventSource();
      const isPermission = kind === "permission";
      const initialRequest = isPermission
        ? {
            id,
            sessionID: "ses_1",
            permission: "fs.read",
            metadata: { attempt: 1 },
          }
        : {
            id,
            sessionID: "ses_1",
            questions: [{ header: "Old", question: "First?", options: [] }],
          };
      const currentRequest = isPermission
        ? {
            ...initialRequest,
            permission: "fs.write",
            metadata: { attempt: 2 },
          }
        : {
            ...initialRequest,
            questions: [{ header: "New", question: "Again?", options: [] }],
          };
      const client = createReconnectClient(
        isPermission
          ? {
              permissions: vi
                .fn()
                .mockResolvedValue({ data: [currentRequest] }),
            }
          : {
              questions: vi.fn().mockResolvedValue({ data: [currentRequest] }),
            },
      );
      const controller = new OpenCodeThreadController(
        client as never,
        () => eventSource,
        "ses_1",
      );
      controller.subscribe(vi.fn());
      eventSource.emit({
        type: isPermission ? "permission.asked" : "question.asked",
        sessionId: "ses_1",
        properties: initialRequest,
        raw: {},
      } as never);
      eventSource.emit(
        (kind === "permission"
          ? {
              type: "permission.replied",
              sessionId: "ses_1",
              properties: { requestID: id, reply: "once" },
              raw: {},
            }
          : kind === "question"
            ? {
                type: "question.replied",
                sessionId: "ses_1",
                properties: { requestID: id, answers: [] },
                raw: {},
              }
            : {
                type: "question.rejected",
                sessionId: "ses_1",
                properties: { requestID: id },
                raw: {},
              }) as never,
      );

      eventSource.emit(streamReconnected);
      await vi.waitFor(() => {
        const pending = isPermission
          ? controller.getState().interactions.permissions.pending[id]
          : controller.getState().interactions.questions.pending[id];
        if (isPermission) {
          expect(pending).toMatchObject({
            permission: "fs.write",
            metadata: { attempt: 2 },
          });
        } else {
          expect(pending).toMatchObject({
            questions: [{ header: "New", question: "Again?", options: [] }],
          });
        }
      });
    },
  );

  it.each(["permission", "question"] as const)(
    "keeps a same-ID snapshot independent from an in-flight $kind reply",
    async (replyKind) => {
      const eventSource = createEventSource();
      const completion = createDeferred<unknown>();
      const permission = {
        id: "shared_id",
        sessionID: "ses_1",
        permission: "fs.write",
        metadata: {},
      };
      const question = {
        id: "shared_id",
        sessionID: "ses_1",
        questions: [],
      };
      const base = createReconnectClient(
        replyKind === "permission"
          ? { questions: vi.fn().mockResolvedValue({ data: [question] }) }
          : { permissions: vi.fn().mockResolvedValue({ data: [permission] }) },
      );
      const client = {
        ...base,
        permission: {
          ...base.permission,
          reply: vi.fn(() => completion.promise),
        },
        question: {
          ...base.question,
          reply: vi.fn(() => completion.promise),
        },
      };
      const controller = new OpenCodeThreadController(
        client as never,
        () => eventSource,
        "ses_1",
      );
      controller.subscribe(vi.fn());
      eventSource.emit({
        type:
          replyKind === "permission" ? "permission.asked" : "question.asked",
        sessionId: "ses_1",
        properties: replyKind === "permission" ? permission : question,
        raw: {},
      } as never);
      const replying =
        replyKind === "permission"
          ? controller.replyToPermission("shared_id", "once" as never)
          : controller.replyToQuestion("shared_id", []);

      eventSource.emit(streamReconnected);
      await vi.waitFor(() => {
        const recovered =
          replyKind === "permission"
            ? controller.getState().interactions.questions.pending.shared_id
            : controller.getState().interactions.permissions.pending.shared_id;
        expect(recovered).toBeDefined();
      });

      completion.resolve({ data: {} });
      await replying;
    },
  );

  it.each([
    { kind: "permission", id: "perm_1" },
    { kind: "question", id: "q_1" },
    { kind: "reject", id: "q_2" },
  ] as const)(
    "does not restore a missed $kind ask while its reply is in flight",
    async ({ kind, id }) => {
      const eventSource = createEventSource();
      const list = createDeferred<{ data: unknown[] }>();
      const completion = createDeferred<unknown>();
      const isPermission = kind === "permission";
      const request = isPermission
        ? {
            id,
            sessionID: "ses_1",
            permission: "fs.write",
            metadata: {},
          }
        : { id, sessionID: "ses_1", questions: [] };
      const base = createReconnectClient(
        isPermission
          ? { permissions: vi.fn(() => list.promise) }
          : { questions: vi.fn(() => list.promise) },
      );
      const client = {
        ...base,
        permission: {
          ...base.permission,
          reply: vi.fn(() => completion.promise),
        },
        question: {
          ...base.question,
          reply: vi.fn(() => completion.promise),
          reject: vi.fn(() => completion.promise),
        },
      };
      const controller = new OpenCodeThreadController(
        client as never,
        () => eventSource,
        "ses_1",
      );
      controller.subscribe(vi.fn());
      eventSource.emit(streamReconnected);
      await vi.waitFor(() =>
        expect(
          isPermission ? client.permission.list : client.question.list,
        ).toHaveBeenCalled(),
      );

      const replying =
        kind === "permission"
          ? controller.replyToPermission(id, "once" as never)
          : kind === "question"
            ? controller.replyToQuestion(id, [])
            : controller.rejectQuestion(id);
      list.resolve({ data: [request] });
      await new Promise((resolve) => setTimeout(resolve, 0));
      const pending = isPermission
        ? controller.getState().interactions.permissions.pending
        : controller.getState().interactions.questions.pending;
      expect(pending[id]).toBeUndefined();

      completion.resolve({ data: {} });
      await replying;
    },
  );
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

  it("ignores a reconnect status response older than a live status event", async () => {
    const eventSource = createEventSource();
    const status = createDeferred<{ data: Record<string, unknown> }>();
    const client = createReconnectClient({
      status: vi.fn(() => status.promise),
    });
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());

    eventSource.emit(streamReconnected);
    eventSource.emit({
      type: "session.status",
      sessionId: "ses_1",
      properties: { status: { type: "busy" } },
      raw: {},
    });

    status.resolve({ data: {} });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(controller.getState().sessionStatus).toMatchObject({
      type: "busy",
    });
  });

  it("ignores a reconnect status response older than a live part update", async () => {
    const eventSource = createEventSource();
    const status = createDeferred<{ data: Record<string, unknown> }>();
    const message = createTaskMessage("ses_1", "message_1", []);
    const part = {
      id: "part_1",
      messageID: "message_1",
      sessionID: "ses_1",
      type: "text",
      text: "Initial",
    };
    const client = createReconnectClient({
      messages: vi.fn().mockResolvedValue({
        data: [{ ...message, parts: [part] }],
      }),
      status: vi.fn(() => status.promise),
    });
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());
    await controller.load();

    eventSource.emit(streamReconnected);
    eventSource.emit({
      type: "message.part.updated",
      sessionId: "ses_1",
      properties: { part: { ...part, text: "Live output" } },
      raw: {},
    });

    status.resolve({ data: {} });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(controller.getState().sessionStatus).toMatchObject({
      type: "busy",
    });
    expect(controller.getState().runState).toMatchObject({
      type: "streaming",
    });
  });

  it("ignores a reconnect status response older than a locally started run", async () => {
    const eventSource = createEventSource();
    const status = createDeferred<{ data: Record<string, unknown> }>();
    const prompt = createDeferred<unknown>();
    const client = createReconnectClient({
      status: vi.fn(() => status.promise),
    });
    Object.assign(client.session, {
      promptAsync: vi.fn(() => prompt.promise),
    });
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());

    eventSource.emit(streamReconnected);
    const send = controller.sendMessage({
      role: "user",
      parentId: null,
      sourceId: null,
      content: [{ type: "text", text: "Hello" }],
      attachments: [],
      metadata: { custom: {} },
      runConfig: {},
      createdAt: new Date(),
    });

    status.resolve({ data: {} });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(controller.getState().sessionStatus).toBeNull();
    expect(controller.getState().runState).toMatchObject({
      type: "streaming",
    });

    prompt.resolve({});
    await send;
  });

  it("preserves live events received while history is loading", async () => {
    const session = createDeferred<{ data: unknown }>();
    const messages = createDeferred<{ data: unknown[] }>();
    const eventSource = createEventSource();
    const client = {
      session: {
        get: vi.fn().mockReturnValue(session.promise),
        messages: vi.fn().mockReturnValue(messages.promise),
      },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());

    const load = controller.load();
    const liveMessage = createTaskMessage("ses_1", "live_message", []);
    eventSource.emit({
      type: "message.updated",
      sessionId: "ses_1",
      properties: { info: liveMessage.info },
      raw: {},
    });

    expect(controller.getState().messageOrder).toEqual(["live_message"]);

    session.resolve({ data: { id: "ses_1", time: {} } });
    messages.resolve({ data: [] });
    await load;

    expect(controller.getState().messageOrder).toEqual(["live_message"]);
  });

  it.each(["message", "part", "delta"] as const)(
    "drops untouched cached parts omitted by history after a live %s update",
    async (update) => {
      const messages = createDeferred<{ data: unknown[] }>();
      const eventSource = createEventSource();
      const message = createTaskMessage("ses_1", "message_1", []);
      const part = {
        id: "part_1",
        messageID: "message_1",
        sessionID: "ses_1",
        type: "text",
        text: "Initial",
      };
      const removedPart = { ...part, id: "removed_part", text: "Deleted" };
      const client = {
        session: {
          get: vi.fn().mockResolvedValue({ data: { id: "ses_1", time: {} } }),
          messages: vi
            .fn()
            .mockResolvedValueOnce({
              data: [{ ...message, parts: [part, removedPart] }],
            })
            .mockReturnValueOnce(messages.promise),
        },
      };
      const controller = new OpenCodeThreadController(
        client as never,
        () => eventSource,
        "ses_1",
      );
      controller.subscribe(vi.fn());
      await controller.load();

      const load = controller.refresh();
      const livePart = { ...part, text: "Initial live" };
      const event =
        update === "message"
          ? { type: "message.updated", properties: { info: message.info } }
          : update === "part"
            ? {
                type: "message.part.updated",
                properties: { part: livePart },
              }
            : {
                type: "message.part.delta",
                properties: {
                  messageID: "message_1",
                  partID: "part_1",
                  field: "text",
                  delta: " live",
                },
              };
      eventSource.emit({ ...event, sessionId: "ses_1", raw: {} });
      messages.resolve({ data: [{ ...message, parts: [livePart] }] });
      await load;

      expect(controller.getState().messagesById.message_1?.parts).toEqual([
        livePart,
      ]);
    },
  );

  it.each(["part", "delta"] as const)(
    "retains only the omitted live %s across a forced replacement load",
    async (update) => {
      const firstMessages = createDeferred<{ data: unknown[] }>();
      const secondMessages = createDeferred<{ data: unknown[] }>();
      const eventSource = createEventSource();
      const message = createTaskMessage("ses_1", "message_1", []);
      const part = {
        id: "part_1",
        messageID: "message_1",
        sessionID: "ses_1",
        type: "text",
        text: "Initial",
      };
      const removedPart = { ...part, id: "removed_part", text: "Deleted" };
      const client = {
        session: {
          get: vi.fn().mockResolvedValue({ data: { id: "ses_1", time: {} } }),
          messages: vi
            .fn()
            .mockResolvedValueOnce({
              data: [{ ...message, parts: [part, removedPart] }],
            })
            .mockReturnValueOnce(firstMessages.promise)
            .mockReturnValueOnce(secondMessages.promise),
        },
      };
      const controller = new OpenCodeThreadController(
        client as never,
        () => eventSource,
        "ses_1",
      );
      controller.subscribe(vi.fn());
      await controller.load();

      const firstLoad = controller.refresh();
      const livePart = { ...part, text: "Initial live" };
      const event =
        update === "part"
          ? {
              type: "message.part.updated",
              properties: { part: livePart },
            }
          : {
              type: "message.part.delta",
              properties: {
                messageID: "message_1",
                partID: "part_1",
                field: "text",
                delta: " live",
              },
            };
      eventSource.emit({ ...event, sessionId: "ses_1", raw: {} });
      const secondLoad = controller.refresh();
      firstMessages.resolve({ data: [] });
      await firstLoad;
      secondMessages.resolve({ data: [message] });
      await secondLoad;

      expect(controller.getState().messagesById.message_1?.parts).toEqual([
        livePart,
      ]);
    },
  );

  it("preserves an unknown part update through its forced refresh", async () => {
    const eventSource = createEventSource();
    const message = createTaskMessage("ses_1", "message_1", []);
    const client = {
      session: {
        get: vi.fn().mockResolvedValue({ data: { id: "ses_1", time: {} } }),
        messages: vi.fn().mockResolvedValue({ data: [message] }),
      },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());

    eventSource.emit({
      type: "message.part.updated",
      sessionId: "ses_1",
      properties: {
        part: {
          id: "part_1",
          messageID: "message_1",
          sessionID: "ses_1",
          type: "text",
          text: "Live output",
        },
      },
      raw: {},
    });

    await vi.waitFor(() => {
      expect(controller.getState().messagesById.message_1?.parts).toMatchObject(
        [{ id: "part_1", text: "Live output" }],
      );
    });
  });

  it("preserves loaded parts after a live message info update", async () => {
    const session = createDeferred<{ data: unknown }>();
    const messages = createDeferred<{ data: unknown[] }>();
    const eventSource = createEventSource();
    const client = {
      session: {
        get: vi.fn().mockReturnValue(session.promise),
        messages: vi.fn().mockReturnValue(messages.promise),
      },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());

    const load = controller.load();
    const message = createTaskMessage("ses_1", "message_1", []);
    eventSource.emit({
      type: "message.updated",
      sessionId: "ses_1",
      properties: { info: message.info },
      raw: {},
    });
    session.resolve({ data: { id: "ses_1", time: {} } });
    messages.resolve({
      data: [
        {
          ...message,
          parts: [
            {
              id: "part_1",
              messageID: "message_1",
              sessionID: "ses_1",
              type: "text",
              text: "Loaded output",
            },
          ],
        },
      ],
    });
    await load;

    expect(controller.getState().messagesById.message_1?.parts).toMatchObject([
      { id: "part_1", text: "Loaded output" },
    ]);
  });

  it("preserves optimistic shadow parts after a live message update", async () => {
    const session = createDeferred<{ data: unknown }>();
    const messages = createDeferred<{ data: unknown[] }>();
    const eventSource = createEventSource();
    const client = {
      session: {
        get: vi.fn().mockReturnValue(session.promise),
        messages: vi.fn().mockReturnValue(messages.promise),
      },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());

    const shadowParts = [{ type: "text", text: "Pending text" }] as const;
    (
      controller as unknown as {
        dispatch: (event: unknown) => void;
      }
    ).dispatch({
      type: "local.message.queued",
      pending: {
        clientId: "local_1",
        sessionId: "ses_1",
        createdAt: 1000,
        parentId: null,
        sourceId: null,
        runConfig: undefined,
        contentText: "Pending text",
        parts: shadowParts,
        status: "pending",
      },
    });

    const load = controller.load();
    const info = {
      id: "message_1",
      role: "user",
      sessionID: "ses_1",
      time: { created: 1000 },
    } as const;
    eventSource.emit({
      type: "message.updated",
      sessionId: "ses_1",
      properties: { info },
      raw: {},
    });
    session.resolve({ data: { id: "ses_1", time: {} } });
    messages.resolve({ data: [{ info, parts: [] }] });
    await load;

    expect(controller.getState().messagesById.message_1?.shadowParts).toEqual(
      shadowParts,
    );
  });

  it("does not duplicate deltas already present in loaded history", async () => {
    const session = createDeferred<{ data: unknown }>();
    const messages = createDeferred<{ data: unknown[] }>();
    const eventSource = createEventSource();
    const client = {
      session: {
        get: vi.fn().mockReturnValue(session.promise),
        messages: vi.fn().mockReturnValue(messages.promise),
      },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());

    const message = createTaskMessage("ses_1", "message_1", []);
    const initialPart = {
      id: "part_1",
      messageID: "message_1",
      sessionID: "ses_1",
      type: "text",
      text: "Hello",
    };
    eventSource.emit({
      type: "message.updated",
      sessionId: "ses_1",
      properties: { info: message.info },
      raw: {},
    });
    eventSource.emit({
      type: "message.part.updated",
      sessionId: "ses_1",
      properties: { part: initialPart },
      raw: {},
    });

    const load = controller.load();
    eventSource.emit({
      type: "message.part.delta",
      sessionId: "ses_1",
      properties: {
        messageID: "message_1",
        partID: "part_1",
        field: "text",
        delta: " world",
      },
      raw: {},
    });
    session.resolve({ data: { id: "ses_1", time: {} } });
    messages.resolve({
      data: [
        {
          ...message,
          parts: [{ ...initialPart, text: "Hello world" }],
        },
      ],
    });
    await load;

    expect(controller.getState().messagesById.message_1?.parts).toMatchObject([
      { id: "part_1", text: "Hello world" },
    ]);
  });

  it("uses loaded history when it contains more complete part content", async () => {
    const session = createDeferred<{ data: unknown }>();
    const messages = createDeferred<{ data: unknown[] }>();
    const eventSource = createEventSource();
    const client = {
      session: {
        get: vi.fn().mockReturnValue(session.promise),
        messages: vi.fn().mockReturnValue(messages.promise),
      },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());

    const message = createTaskMessage("ses_1", "message_1", []);
    const initialPart = {
      id: "part_1",
      messageID: "message_1",
      sessionID: "ses_1",
      type: "text",
      text: "Hello",
    };
    eventSource.emit({
      type: "message.updated",
      sessionId: "ses_1",
      properties: { info: message.info },
      raw: {},
    });
    eventSource.emit({
      type: "message.part.updated",
      sessionId: "ses_1",
      properties: { part: initialPart },
      raw: {},
    });

    const load = controller.load();
    eventSource.emit({
      type: "message.part.delta",
      sessionId: "ses_1",
      properties: {
        messageID: "message_1",
        partID: "part_1",
        field: "text",
        delta: " again",
      },
      raw: {},
    });
    session.resolve({ data: { id: "ses_1", time: {} } });
    messages.resolve({
      data: [
        {
          ...message,
          parts: [{ ...initialPart, text: "Hello world again" }],
        },
      ],
    });
    await load;

    expect(controller.getState().messagesById.message_1?.parts).toMatchObject([
      { id: "part_1", text: "Hello world again" },
    ]);
  });

  it("keeps loaded same-id parts authoritative over live updates", async () => {
    const session = createDeferred<{ data: unknown }>();
    const messages = createDeferred<{ data: unknown[] }>();
    const eventSource = createEventSource();
    const client = {
      session: {
        get: vi.fn().mockReturnValue(session.promise),
        messages: vi.fn().mockReturnValue(messages.promise),
      },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());

    const message = createTaskMessage("ses_1", "message_1", []);
    const part = {
      id: "part_1",
      messageID: "message_1",
      sessionID: "ses_1",
      type: "text",
      text: "Initial",
    };
    eventSource.emit({
      type: "message.updated",
      sessionId: "ses_1",
      properties: { info: message.info },
      raw: {},
    });
    eventSource.emit({
      type: "message.part.updated",
      sessionId: "ses_1",
      properties: { part },
      raw: {},
    });

    const load = controller.load();
    eventSource.emit({
      type: "message.part.updated",
      sessionId: "ses_1",
      properties: { part: { ...part, text: "Live output" } },
      raw: {},
    });
    session.resolve({ data: { id: "ses_1", time: {} } });
    messages.resolve({
      data: [{ ...message, parts: [{ ...part, text: "Loaded output" }] }],
    });
    await load;

    expect(controller.getState().messagesById.message_1?.parts).toMatchObject([
      { id: "part_1", text: "Loaded output" },
    ]);
  });

  it("does not resurrect parts removed during a history load", async () => {
    const session = createDeferred<{ data: unknown }>();
    const messages = createDeferred<{ data: unknown[] }>();
    const eventSource = createEventSource();
    const client = {
      session: {
        get: vi.fn().mockReturnValue(session.promise),
        messages: vi.fn().mockReturnValue(messages.promise),
      },
    };
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );
    controller.subscribe(vi.fn());

    const message = createTaskMessage("ses_1", "message_1", []);
    const part = {
      id: "part_1",
      messageID: "message_1",
      sessionID: "ses_1",
      type: "text",
      text: "Removed output",
    };
    eventSource.emit({
      type: "message.updated",
      sessionId: "ses_1",
      properties: { info: message.info },
      raw: {},
    });
    eventSource.emit({
      type: "message.part.updated",
      sessionId: "ses_1",
      properties: { part },
      raw: {},
    });

    const load = controller.load();
    eventSource.emit({
      type: "message.part.removed",
      sessionId: "ses_1",
      properties: { messageID: "message_1", partID: "part_1" },
      raw: {},
    });
    session.resolve({ data: { id: "ses_1", time: {} } });
    messages.resolve({ data: [{ ...message, parts: [part] }] });
    await load;

    expect(controller.getState().messagesById.message_1?.parts).toEqual([]);
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

    const eventSource = createEventSource();
    const controller = new OpenCodeThreadController(
      client as never,
      () => eventSource,
      "ses_1",
    );

    controller.subscribe(vi.fn());
    const firstLoad = controller.load();
    const liveMessage = createTaskMessage("ses_1", "live_message", []);
    eventSource.emit({
      type: "message.updated",
      sessionId: "ses_1",
      properties: { info: liveMessage.info },
      raw: {},
    });
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
    expect(controller.getState().messageOrder).toEqual([
      "live_message",
      "fresh_message",
    ]);
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
