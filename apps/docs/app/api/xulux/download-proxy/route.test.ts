import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  checkRateLimit: vi.fn(),
  fetchSandboxResource: vi.fn(),
  resolveSandboxDownloadUrl: vi.fn(),
}));

vi.mock("@/lib/feature-flags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/feature-flags")>()),
  isAiPlaygroundEnabled: true,
}));

vi.mock("@/lib/anonymous-session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/anonymous-session")>()),
  requirePublicAssistantSession: mocks.requireSession,
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  checkXuluxDownloadProxyRateLimit: mocks.checkRateLimit,
}));

vi.mock("@/lib/xulux/fetch-sandbox", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/xulux/fetch-sandbox")>()),
  fetchSandboxResource: mocks.fetchSandboxResource,
}));

vi.mock("@/lib/xulux/sandbox-download-url", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/lib/xulux/sandbox-download-url")
  >()),
  resolveSandboxDownloadUrl: mocks.resolveSandboxDownloadUrl,
}));

import { GET } from "./route";

const session = { id: "session_1234567890", expiresAt: Date.now() + 60_000 };
const request = () =>
  new Request(
    "https://www.assistant-ui.com/api/xulux/download-proxy?templateId=demo",
  );

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("GET /api/xulux/download-proxy access boundary", () => {
  it("rejects a request without a browser session before metering", async () => {
    mocks.requireSession.mockReturnValue(
      Response.json({ error: "website required" }, { status: 403 }),
    );

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.fetchSandboxResource).not.toHaveBeenCalled();
  });

  it("stops an exhausted quota before the sandbox is reached", async () => {
    mocks.requireSession.mockReturnValue(session);
    mocks.checkRateLimit.mockResolvedValue(
      new Response("limited", { status: 429 }),
    );

    const response = await GET(request());

    expect(response.status).toBe(429);
    expect(mocks.resolveSandboxDownloadUrl).not.toHaveBeenCalled();
    expect(mocks.fetchSandboxResource).not.toHaveBeenCalled();
  });

  it("streams the archive rather than buffering it before responding", async () => {
    mocks.requireSession.mockReturnValue(session);
    mocks.checkRateLimit.mockResolvedValue(null);
    mocks.resolveSandboxDownloadUrl.mockReturnValue(
      new URL("https://demo.bl.run/api/download"),
    );

    let push!: (chunk: Uint8Array) => void;
    let finish!: () => void;
    const upstreamBody = new ReadableStream<Uint8Array>({
      start(controller) {
        push = (chunk) => controller.enqueue(chunk);
        finish = () => controller.close();
      },
    });
    mocks.fetchSandboxResource.mockResolvedValue(
      new Response(upstreamBody, {
        status: 200,
        headers: { "content-type": "application/zip" },
      }),
    );

    const response = await GET(request());
    expect(response.status).toBe(200);

    const reader = response.body!.getReader();
    push(new Uint8Array([1, 2]));
    await expect(reader.read()).resolves.toEqual({
      done: false,
      value: new Uint8Array([1, 2]),
    });

    finish();
    await expect(reader.read()).resolves.toEqual({
      done: true,
      value: undefined,
    });
  });

  it("cuts off an archive that outgrows the ceiling mid-stream", async () => {
    mocks.requireSession.mockReturnValue(session);
    mocks.checkRateLimit.mockResolvedValue(null);
    mocks.resolveSandboxDownloadUrl.mockReturnValue(
      new URL("https://demo.bl.run/api/download"),
    );

    const megabyte = new Uint8Array(1024 * 1024);
    const upstreamBody = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(megabyte);
      },
    });
    mocks.fetchSandboxResource.mockResolvedValue(
      new Response(upstreamBody, {
        status: 200,
        headers: { "content-type": "application/zip" },
      }),
    );

    const response = await GET(request());
    expect(response.status).toBe(200);

    const reader = response.body!.getReader();
    await expect(
      (async () => {
        while (true) {
          const { done } = await reader.read();
          if (done) return;
        }
      })(),
    ).rejects.toThrow("Archive too large.");
  });

  it("drops the upstream content-length when the body was decoded", async () => {
    mocks.requireSession.mockReturnValue(session);
    mocks.checkRateLimit.mockResolvedValue(null);
    mocks.resolveSandboxDownloadUrl.mockReturnValue(
      new URL("https://demo.bl.run/api/download"),
    );
    mocks.fetchSandboxResource.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3, 4, 5, 6]), {
        status: 200,
        headers: {
          "content-type": "application/zip",
          "content-length": "3",
          "content-encoding": "gzip",
        },
      }),
    );

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-length")).toBeNull();
  });

  it("forwards the upstream content-length when nothing decoded the body", async () => {
    mocks.requireSession.mockReturnValue(session);
    mocks.checkRateLimit.mockResolvedValue(null);
    mocks.resolveSandboxDownloadUrl.mockReturnValue(
      new URL("https://demo.bl.run/api/download"),
    );
    mocks.fetchSandboxResource.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "application/zip", "content-length": "3" },
      }),
    );

    const response = await GET(request());

    expect(response.headers.get("content-length")).toBe("3");
  });

  it("does not wait out an upstream that holds its error body open", async () => {
    vi.useFakeTimers();
    mocks.requireSession.mockReturnValue(session);
    mocks.checkRateLimit.mockResolvedValue(null);
    mocks.resolveSandboxDownloadUrl.mockReturnValue(
      new URL("https://demo.bl.run/api/download"),
    );

    let cancelled = false;
    const stalled = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    mocks.fetchSandboxResource.mockResolvedValue(
      new Response(stalled, { status: 500 }),
    );

    const pending = GET(request());
    await vi.advanceTimersByTimeAsync(5_000);
    const response = await pending;

    expect(response.status).toBe(502);
    expect(cancelled).toBe(true);
  });

  it("releases the upstream body when the declared size is too large", async () => {
    mocks.requireSession.mockReturnValue(session);
    mocks.checkRateLimit.mockResolvedValue(null);
    mocks.resolveSandboxDownloadUrl.mockReturnValue(
      new URL("https://demo.bl.run/api/download"),
    );

    let cancelled = false;
    const oversized = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    mocks.fetchSandboxResource.mockResolvedValue(
      new Response(oversized, {
        status: 200,
        headers: {
          "content-type": "application/zip",
          "content-length": String(64 * 1024 * 1024),
        },
      }),
    );

    const response = await GET(request());

    expect(response.status).toBe(413);
    expect(cancelled).toBe(true);
  });

  it("keeps a metered archive out of shared caches", async () => {
    mocks.requireSession.mockReturnValue(session);
    mocks.checkRateLimit.mockResolvedValue(null);
    mocks.resolveSandboxDownloadUrl.mockReturnValue(
      new URL("https://demo.bl.run/api/download"),
    );
    mocks.fetchSandboxResource.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "application/zip" },
      }),
    );

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, max-age=3600");
    expect(await response.arrayBuffer()).toEqual(
      new Uint8Array([1, 2, 3]).buffer,
    );
  });
});
