import type {
  ChatModelAdapter,
  ChatModelRunOptions,
  ThreadMessage,
} from "@assistant-ui/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataStreamRuntimeAdapter } from "./DataStreamRuntimeAdapter";

const userMessage: ThreadMessage = {
  id: "user-message",
  role: "user",
  content: [{ type: "text", text: "Hello" }],
  attachments: [],
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  metadata: { custom: {} },
};

const createRunOptions = (abortSignal: AbortSignal): ChatModelRunOptions =>
  ({
    messages: [],
    runConfig: {},
    abortSignal,
    context: {},
    unstable_getMessage: () => userMessage,
  }) satisfies ChatModelRunOptions;

const runOnce = (adapter: ChatModelAdapter, options: ChatModelRunOptions) =>
  (adapter.run(options) as AsyncGenerator).next();

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("DataStreamRuntimeAdapter cancellation", () => {
  it("invokes onCancel when the signal is already aborted before the run starts", async () => {
    const onCancel = vi.fn();
    const onError = vi.fn();
    const abortError = new DOMException("Cancelled", "AbortError");
    const controller = new AbortController();
    controller.abort(abortError);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    const adapter = new DataStreamRuntimeAdapter({
      api: "/api/chat",
      onCancel,
      onError,
    });

    await expect(
      runOnce(adapter, createRunOptions(controller.signal)),
    ).rejects.toBe(abortError);
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it("does not invoke onCancel when the run was aborted by a detach", async () => {
    const onCancel = vi.fn();
    const detachError = Object.assign(
      new DOMException("Detached", "AbortError"),
      { detach: true },
    );
    const controller = new AbortController();
    controller.abort(detachError);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(detachError));

    const adapter = new DataStreamRuntimeAdapter({
      api: "/api/chat",
      onCancel,
    });

    await expect(
      runOnce(adapter, createRunOptions(controller.signal)),
    ).rejects.toBe(detachError);
    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe("DataStreamRuntimeAdapter response handling", () => {
  it("reports a response that carries no body", async () => {
    const onError = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null)));

    const adapter = new DataStreamRuntimeAdapter({
      api: "/api/chat",
      protocol: "ui-message-stream",
      onError,
    });

    await expect(
      runOnce(adapter, createRunOptions(new AbortController().signal)),
    ).rejects.toThrow("Response body is null");
    expect(onError).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ message: "Response body is null" }),
    );
  });

  it("reports a non-ok response with its status and body text", async () => {
    const onError = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("upstream exploded", { status: 503 })),
    );

    const adapter = new DataStreamRuntimeAdapter({ api: "/api/chat", onError });

    await expect(
      runOnce(adapter, createRunOptions(new AbortController().signal)),
    ).rejects.toThrow("Status 503: upstream exploded");
    expect(onError).toHaveBeenCalledOnce();
  });
});

describe("DataStreamRuntimeAdapter tool interrupt", () => {
  const uiMessageStream = (events: readonly Record<string, unknown>[]) =>
    new Response(
      `${events
        .map((event) => `data: ${JSON.stringify(event)}\n\n`)
        .join("")}data: [DONE]\n\n`,
    );

  it("reports a human interrupt as a tool error", async () => {
    const onError = vi.fn();
    const afterHuman = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        uiMessageStream([
          { type: "start", messageId: "assistant-1" },
          {
            type: "tool-input-start",
            toolCallId: "call-1",
            toolName: "ask",
          },
          {
            type: "tool-input-available",
            toolCallId: "call-1",
            toolName: "ask",
            input: {},
          },
          { type: "finish", finishReason: "tool-calls" },
        ]),
      ),
    );

    const adapter = new DataStreamRuntimeAdapter({
      api: "/api/chat",
      protocol: "ui-message-stream",
      onError,
    });
    const options = {
      ...createRunOptions(new AbortController().signal),
      context: {
        tools: {
          ask: {
            parameters: { type: "object", properties: {} } as const,
            execute: async (
              _args: unknown,
              { human }: { human: (payload: unknown) => Promise<unknown> },
            ) => {
              await human({});
              afterHuman();
              return "unreachable";
            },
          },
        },
      },
    };

    const chunks: unknown[] = [];
    for await (const chunk of adapter.run(options) as AsyncGenerator) {
      chunks.push(chunk);
    }

    expect(onError).not.toHaveBeenCalled();
    expect(afterHuman).not.toHaveBeenCalled();
    const last = chunks.at(-1) as {
      parts: { type: string; result?: unknown; isError?: boolean }[];
    };
    const parts = last.parts;
    expect(parts.find((part) => part.type === "tool-call")).toMatchObject({
      isError: true,
      result: "Error: Tool interrupt is not supported in data stream runtime",
    });
  });
});

describe("DataStreamRuntimeAdapter protocol fallback", () => {
  /**
   * The fallback warning is latched in a module-level flag, so each test imports
   * a fresh copy of the module to observe the first-time branch.
   */
  const importFreshAdapter = async () => {
    vi.resetModules();
    return (await import("./DataStreamRuntimeAdapter"))
      .DataStreamRuntimeAdapter;
  };

  const emptyStreamResponse = (headers?: Record<string, string>) =>
    new Response("data: [DONE]\n\n", headers ? { headers } : undefined);

  it("warns once when no protocol header is present and none is configured", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => emptyStreamResponse()),
    );

    const Adapter = await importFreshAdapter();
    const adapter = new Adapter({ api: "/api/chat" });

    await runOnce(adapter, createRunOptions(new AbortController().signal));
    await runOnce(adapter, createRunOptions(new AbortController().signal));

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain("could not detect a stream");
  });

  it("stays silent when the protocol is configured explicitly", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => emptyStreamResponse()),
    );

    const Adapter = await importFreshAdapter();
    const adapter = new Adapter({
      api: "/api/chat",
      protocol: "ui-message-stream",
    });

    await runOnce(adapter, createRunOptions(new AbortController().signal));

    expect(warn).not.toHaveBeenCalled();
  });

  it("stays silent when the response advertises a protocol header", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(async () =>
          emptyStreamResponse({ "x-vercel-ai-ui-message-stream": "v1" }),
        ),
    );

    const Adapter = await importFreshAdapter();
    const adapter = new Adapter({ api: "/api/chat" });

    await runOnce(adapter, createRunOptions(new AbortController().signal));

    expect(warn).not.toHaveBeenCalled();
  });
});
