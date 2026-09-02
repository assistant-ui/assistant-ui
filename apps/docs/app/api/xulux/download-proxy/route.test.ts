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
