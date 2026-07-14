import type {
  ChatModelAdapter,
  ChatModelRunOptions,
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

afterEach(() => {
  vi.unstubAllGlobals();
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
});
