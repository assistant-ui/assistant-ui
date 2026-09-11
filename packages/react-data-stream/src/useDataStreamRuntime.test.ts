import type {
  ChatModelAdapter,
  ChatModelRunOptions,
  ThreadAssistantMessage,
  ThreadMessage,
} from "@assistant-ui/core";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useLocalRuntime: vi.fn((adapter: ChatModelAdapter) => adapter),
}));

vi.mock("@assistant-ui/core/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/core/react")>()),
  useLocalRuntime: mocks.useLocalRuntime,
}));

import {
  useDataStreamRuntime,
  type UseDataStreamRuntimeOptions,
} from "./useDataStreamRuntime";

const userMessage: ThreadMessage = {
  id: "user-message",
  role: "user",
  content: [{ type: "text", text: "Hello" }],
  attachments: [],
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  metadata: { custom: {} },
};

const createRunOptions = (abortSignal = new AbortController().signal) =>
  ({
    messages: [],
    runConfig: {},
    abortSignal,
    context: {},
    unstable_getMessage: () => userMessage,
  }) satisfies ChatModelRunOptions;

const createAdapter = (options: UseDataStreamRuntimeOptions) => {
  // oxlint-disable-next-line react-hooks/rules-of-hooks -- useLocalRuntime is mocked to return the adapter.
  return useDataStreamRuntime(options) as unknown as ChatModelAdapter;
};

const runOnce = (adapter: ChatModelAdapter, options: ChatModelRunOptions) =>
  (adapter.run(options) as AsyncGenerator).next();

const runToCompletion = async (
  adapter: ChatModelAdapter,
  options: ChatModelRunOptions,
) => {
  for await (const _ of adapter.run(options)) void _;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("useDataStreamRuntime request errors", () => {
  it.each(["headers", "body"] as const)(
    "reports async %s resolution failures",
    async (option) => {
      const error = new Error(`${option} failed`);
      const onError = vi.fn();
      const resolver = vi.fn().mockRejectedValue(error);
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const adapter = createAdapter({
        api: "/api/chat",
        onError,
        ...(option === "headers" ? { headers: resolver } : { body: resolver }),
      });

      await expect(runOnce(adapter, createRunOptions())).rejects.toBe(error);
      expect(onError).toHaveBeenCalledExactlyOnceWith(error);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("reports fetch failures", async () => {
    const error = new TypeError("Failed to fetch");
    const onError = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));

    const adapter = createAdapter({ api: "/api/chat", onError });

    await expect(runOnce(adapter, createRunOptions())).rejects.toBe(error);
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
  });

  it("keeps mid-stream cancellation separate from stream errors", async () => {
    const controller = new AbortController();
    const abortError = new DOMException("Cancelled", "AbortError");
    const onCancel = vi.fn();
    const onError = vi.fn();
    const encoder = new TextEncoder();

    vi.stubGlobal(
      "fetch",
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        const body = new ReadableStream<Uint8Array>({
          start(streamController) {
            streamController.enqueue(encoder.encode('0:"Hello"\n'));
            init?.signal?.addEventListener(
              "abort",
              () => streamController.error(init.signal?.reason),
              { once: true },
            );
          },
        });
        return Promise.resolve(
          new Response(body, {
            status: 200,
            headers: { "x-vercel-ai-data-stream": "v1" },
          }),
        );
      }),
    );

    const adapter = createAdapter({ api: "/api/chat", onCancel, onError });
    const run = async () => {
      for await (const _ of adapter.run(
        createRunOptions(controller.signal),
      ) as AsyncGenerator) {
        void _;
        controller.abort(abortError);
      }
    };

    await expect(run()).rejects.toBe(abortError);
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it("normalizes non-Error stream failures for onError", async () => {
    const onError = vi.fn();
    const encoder = new TextEncoder();

    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        const body = new ReadableStream<Uint8Array>({
          start(streamController) {
            streamController.enqueue(encoder.encode('0:"Hello"\n'));
            streamController.error("wire failure");
          },
        });
        return Promise.resolve(
          new Response(body, {
            status: 200,
            headers: { "x-vercel-ai-data-stream": "v1" },
          }),
        );
      }),
    );

    const adapter = createAdapter({ api: "/api/chat", onError });

    await expect(runToCompletion(adapter, createRunOptions())).rejects.toBe(
      "wire failure",
    );
    expect(onError).toHaveBeenCalledExactlyOnceWith(new Error("wire failure"));
  });

  it.each(["throws", "rejects"] as const)(
    "preserves request failures when onError %s",
    async (failureMode) => {
      const requestError = new TypeError("Failed to fetch");
      const callbackError = new Error("error callback failed");
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(requestError));

      const adapter = createAdapter({
        api: "/api/chat",
        onError: () => {
          if (failureMode === "throws") throw callbackError;
          return Promise.reject(callbackError);
        },
      });

      await expect(runOnce(adapter, createRunOptions())).rejects.toBe(
        requestError,
      );
      await vi.waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "[react-data-stream] onError callback threw an error",
          callbackError,
        );
      });
    },
  );

  it("keeps response callback failures separate from request errors", async () => {
    const error = new Error("response callback failed");
    const cancel = vi.fn().mockRejectedValue(new Error("cancel failed"));
    const onResponse = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          new ReadableStream({
            cancel,
          }),
        ),
      ),
    );

    const adapter = createAdapter({ api: "/api/chat", onResponse, onError });

    await expect(runOnce(adapter, createRunOptions())).rejects.toBe(error);
    expect(onResponse).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it.each(["throws", "rejects"] as const)(
    "preserves stream failures when onError %s",
    async (failureMode) => {
      const streamError = new Error("stream failed");
      const callbackError = new Error("error callback failed");
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const body = new ReadableStream({
        start(controller) {
          controller.error(streamError);
        },
      });
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));

      const adapter = createAdapter({
        api: "/api/chat",
        protocol: "ui-message-stream",
        onError: () => {
          if (failureMode === "throws") throw callbackError;
          return Promise.reject(callbackError);
        },
      });

      await expect(runToCompletion(adapter, createRunOptions())).rejects.toBe(
        streamError,
      );
      await vi.waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "[react-data-stream] onError callback threw an error",
          callbackError,
        );
      });
    },
  );

  it("reports resolver failures that race with cancellation", async () => {
    const controller = new AbortController();
    const error = new Error("headers failed");
    const onError = vi.fn();
    let rejectHeaders: ((reason: Error) => void) | undefined;
    const headers = new Promise<Headers>((_resolve, reject) => {
      rejectHeaders = reject;
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const adapter = createAdapter({
      api: "/api/chat",
      headers: () => headers,
      onError,
    });
    const result = runOnce(adapter, createRunOptions(controller.signal));

    controller.abort();
    rejectHeaders?.(error);

    await expect(result).rejects.toBe(error);
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports cancellation while resolving request options", async () => {
    const controller = new AbortController();
    const abortError = new DOMException("Cancelled", "AbortError");
    const onCancel = vi.fn();
    const onError = vi.fn();
    let resolveHeaders: ((headers: Headers) => void) | undefined;
    const headers = new Promise<Headers>((resolve) => {
      resolveHeaders = resolve;
    });
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      Promise.reject(init?.signal?.reason),
    );
    vi.stubGlobal("fetch", fetchMock);

    const adapter = createAdapter({
      api: "/api/chat",
      headers: () => headers,
      onCancel,
      onError,
    });
    const result = runOnce(adapter, createRunOptions(controller.signal));

    controller.abort(abortError);
    resolveHeaders?.(new Headers());

    await expect(result).rejects.toBe(abortError);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it("normalizes non-Error resolver failures for onError", async () => {
    const onError = vi.fn();
    const rejection = "headers failed";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const adapter = createAdapter({
      api: "/api/chat",
      headers: vi.fn().mockRejectedValue(rejection),
      onError,
    });

    await expect(runOnce(adapter, createRunOptions())).rejects.toBe(rejection);
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]?.[0]).toEqual(new Error(rejection));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps cancellation separate from request errors", async () => {
    const controller = new AbortController();
    const abortError = new DOMException("Cancelled", "AbortError");
    const onCancel = vi.fn();
    const onError = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(init.signal?.reason),
            { once: true },
          );
        });
      }),
    );

    const adapter = createAdapter({
      api: "/api/chat",
      onCancel,
      onError,
    });
    const result = runOnce(adapter, createRunOptions(controller.signal));

    controller.abort(abortError);

    await expect(result).rejects.toBe(abortError);
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it.each(["throws", "rejects"] as const)(
    "keeps cancellation settled when onCancel %s",
    async (failureMode) => {
      const controller = new AbortController();
      const abortError = new DOMException("Cancelled", "AbortError");
      const callbackError = new Error("cancel callback failed");
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      vi.stubGlobal(
        "fetch",
        vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
          return new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => reject(init.signal?.reason),
              { once: true },
            );
          });
        }),
      );
      const adapter = createAdapter({
        api: "/api/chat",
        onCancel: () => {
          if (failureMode === "throws") throw callbackError;
          return Promise.reject(callbackError);
        },
      });
      const result = runOnce(adapter, createRunOptions(controller.signal));

      controller.abort(abortError);

      await expect(result).rejects.toBe(abortError);
      await vi.waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "[react-data-stream] onCancel callback threw an error",
          callbackError,
        );
      });
    },
  );
});

describe("useDataStreamRuntime lifecycle callbacks", () => {
  it.each(["throws", "rejects"] as const)(
    "keeps successful responses successful when onFinish %s",
    async (failureMode) => {
      const callbackError = new Error("finish callback failed");
      const onError = vi.fn();
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("data: [DONE]\n\n")),
      );
      const adapter = createAdapter({
        api: "/api/chat",
        protocol: "ui-message-stream",
        onFinish: () => {
          if (failureMode === "throws") throw callbackError;
          return Promise.reject(callbackError);
        },
        onError,
      });

      await expect(
        runToCompletion(adapter, createRunOptions()),
      ).resolves.toBeUndefined();

      expect(onError).not.toHaveBeenCalled();
      await vi.waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "[react-data-stream] onFinish callback threw an error",
          callbackError,
        );
      });
    },
  );

  it.each(["throws", "rejects"] as const)(
    "keeps streams healthy when onData %s",
    async (failureMode) => {
      const callbackError = new Error("data callback failed");
      const onError = vi.fn();
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const events = [
        { type: "start", messageId: "assistant" },
        { type: "data-weather", data: { temperature: 72 } },
        { type: "finish", finishReason: "stop" },
      ];
      const body = `${events
        .map((event) => `data: ${JSON.stringify(event)}\n\n`)
        .join("")}data: [DONE]\n\n`;
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));
      const adapter = createAdapter({
        api: "/api/chat",
        protocol: "ui-message-stream",
        onData: () => {
          if (failureMode === "throws") throw callbackError;
          return Promise.reject(callbackError);
        },
        onError,
      });

      await expect(
        runToCompletion(adapter, createRunOptions()),
      ).resolves.toBeUndefined();

      expect(onError).not.toHaveBeenCalled();
      await vi.waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "[react-data-stream] onData callback threw an error",
          callbackError,
        );
      });
    },
  );
});

const createAssistantMessage = (
  state: ThreadAssistantMessage["metadata"]["unstable_state"],
): ThreadAssistantMessage => ({
  id: "assistant",
  role: "assistant",
  content: [],
  status: { type: "running" },
  createdAt: new Date(),
  metadata: {
    unstable_state: state,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

const runWithState = async (
  state: ThreadAssistantMessage["metadata"]["unstable_state"],
) => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response("failed", { status: 500 }));
  vi.stubGlobal("fetch", fetchMock);

  const adapter = createAdapter({ api: "/api/chat" });
  const message = createAssistantMessage(state);
  const result = adapter.run({
    messages: [],
    runConfig: {},
    abortSignal: new AbortController().signal,
    context: {},
    unstable_getMessage: () => message,
  } satisfies ChatModelRunOptions) as AsyncGenerator;

  await expect(result.next()).rejects.toThrow("Status 500");

  const request = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
  return JSON.parse(request?.body as string) as Record<string, unknown>;
};

describe("useDataStreamRuntime request state", () => {
  it.each([
    ["false", false],
    ["zero", 0],
    ["an empty string", ""],
  ])("sends %s state", async (_label, state) => {
    await expect(runWithState(state)).resolves.toMatchObject({ state });
  });

  it("omits null state", async () => {
    await expect(runWithState(null)).resolves.not.toHaveProperty("state");
  });
});
