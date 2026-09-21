import type {
  ChatModelAdapter,
  ChatModelRunOptions,
  ThreadMessage,
} from "@assistant-ui/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const runToCompletion = async (
  adapter: ChatModelAdapter,
  options: ChatModelRunOptions,
) => {
  const result = adapter.run(options);
  if (Symbol.asyncIterator in result) {
    for await (const _ of result) void _;
  } else {
    await result;
  }
};

/** The runtime aborts with `detach: false` on `cancelRun()` and `true` on `detach()`. */
const abortReason = (detach: boolean) =>
  Object.assign(new DOMException("Aborted", "AbortError"), { detach });

/** Rejects with the abort reason once the signal aborts, leaving the run in flight until then. */
const stubHangingFetch = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(init.signal?.reason),
            { once: true },
          );
        }),
    ),
  );
};

/**
 * The fallback warning is latched in a module-level flag, so each test imports
 * a fresh copy of the module to observe the first-time branch.
 */
const importAdapter = async () => {
  const { DataStreamRuntimeAdapter } =
    await import("./DataStreamRuntimeAdapter");
  return DataStreamRuntimeAdapter;
};

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("DataStreamRuntimeAdapter cancellation", () => {
  describe.each([
    {
      entry: "a signal already aborted before the run starts",
      start: (reason: DOMException) => {
        const controller = new AbortController();
        controller.abort(reason);
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(reason));
        return { signal: controller.signal, abort: () => {} };
      },
    },
    {
      entry: "a run aborted while the request is in flight",
      start: (reason: DOMException) => {
        const controller = new AbortController();
        stubHangingFetch();
        return {
          signal: controller.signal,
          abort: () => controller.abort(reason),
        };
      },
    },
  ])("$entry", ({ start }) => {
    it("invokes onCancel for a cancelRun abort", async () => {
      const onCancel = vi.fn();
      const onError = vi.fn();
      const reason = abortReason(false);
      const { signal, abort } = start(reason);

      const Adapter = await importAdapter();
      const adapter = new Adapter({ api: "/api/chat", onCancel, onError });

      const run = runOnce(adapter, createRunOptions(signal));
      abort();

      await expect(run).rejects.toBe(reason);
      expect(onCancel).toHaveBeenCalledOnce();
      expect(onError).not.toHaveBeenCalled();
    });

    it("stays silent for a detach abort", async () => {
      const onCancel = vi.fn();
      const reason = abortReason(true);
      const { signal, abort } = start(reason);

      const Adapter = await importAdapter();
      const adapter = new Adapter({ api: "/api/chat", onCancel });

      const run = runOnce(adapter, createRunOptions(signal));
      abort();

      await expect(run).rejects.toBe(reason);
      expect(onCancel).not.toHaveBeenCalled();
    });
  });
});

describe("DataStreamRuntimeAdapter response handling", () => {
  it("reports a response that carries no body", async () => {
    const onError = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null)));

    const Adapter = await importAdapter();
    const adapter = new Adapter({ api: "/api/chat", onError });

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

    const Adapter = await importAdapter();
    const adapter = new Adapter({ api: "/api/chat", onError });

    await expect(
      runOnce(adapter, createRunOptions(new AbortController().signal)),
    ).rejects.toThrow("Status 503: upstream exploded");
    expect(onError).toHaveBeenCalledOnce();
  });
});

describe("DataStreamRuntimeAdapter protocol fallback", () => {
  const emptyStreamResponse = (headers?: Record<string, string>) =>
    new Response("data: [DONE]\n\n", headers ? { headers } : undefined);

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
  });

  it("warns once when no protocol header is present and none is configured", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => emptyStreamResponse()),
    );

    const Adapter = await importAdapter();
    const adapter = new Adapter({ api: "/api/chat" });

    await runToCompletion(
      adapter,
      createRunOptions(new AbortController().signal),
    );
    await runToCompletion(
      adapter,
      createRunOptions(new AbortController().signal),
    );

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain("could not detect a stream");
  });

  it("stays silent when the protocol is configured explicitly", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => emptyStreamResponse()),
    );

    const Adapter = await importAdapter();
    const adapter = new Adapter({
      api: "/api/chat",
      protocol: "ui-message-stream",
    });

    await runToCompletion(
      adapter,
      createRunOptions(new AbortController().signal),
    );

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

    const Adapter = await importAdapter();
    const adapter = new Adapter({ api: "/api/chat" });

    await runToCompletion(
      adapter,
      createRunOptions(new AbortController().signal),
    );

    expect(warn).not.toHaveBeenCalled();
  });
});
