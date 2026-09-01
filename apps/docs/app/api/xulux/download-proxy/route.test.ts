import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  checkRateLimit: vi.fn(),
  refundByteBudget: vi.fn(),
  fetchSandboxResource: vi.fn(),
  resolveDownloadUrl: vi.fn(),
  getCatalog: vi.fn(() => ({ templates: [] })),
}));

vi.mock("@/lib/anonymous-session", async (importOriginal) => ({
  ...(await importOriginal()),
  requirePublicAssistantSession: mocks.requireSession,
}));

vi.mock("@/lib/feature-flags", async (importOriginal) => ({
  ...(await importOriginal()),
  isAiPlaygroundEnabled: true,
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal()),
  checkXuluxDownloadRateLimit: mocks.checkRateLimit,
  refundXuluxDownloadByteBudget: mocks.refundByteBudget,
}));

vi.mock("@/lib/xulux/fetch-sandbox", async (importOriginal) => ({
  ...(await importOriginal()),
  fetchSandboxResource: mocks.fetchSandboxResource,
}));

vi.mock("@/lib/xulux/sandbox-download-url", async (importOriginal) => ({
  ...(await importOriginal()),
  resolveSandboxDownloadUrl: mocks.resolveDownloadUrl,
}));

vi.mock("@/lib/xulux/templates-catalog", async (importOriginal) => ({
  ...(await importOriginal()),
  getXuluxHostedTemplatesCatalog: mocks.getCatalog,
}));

import { GET } from "./route";

const publicSession = {
  id: "session_1234567890",
  expiresAt: Date.now() + 60_000,
};

const request = () =>
  new Request(
    "https://www.assistant-ui.com/api/xulux/download-proxy?templateId=template",
    {
      headers: {
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-vercel-forwarded-for": "203.0.113.10",
      },
    },
  );

beforeEach(() => {
  mocks.requireSession.mockReturnValue(publicSession);
  mocks.checkRateLimit.mockResolvedValue(null);
  mocks.refundByteBudget.mockResolvedValue(undefined);
  mocks.resolveDownloadUrl.mockReturnValue(
    new URL("https://sandbox.bl.run/api/download"),
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/xulux/download-proxy access boundary", () => {
  it("rejects requests without a public assistant session", async () => {
    mocks.requireSession.mockReturnValue(
      Response.json({ error: "website required" }, { status: 403 }),
    );

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.fetchSandboxResource).not.toHaveBeenCalled();
  });

  it("stops before the sandbox fetch when the download budget is exhausted", async () => {
    mocks.checkRateLimit.mockResolvedValue(
      new Response("limited", { status: 429 }),
    );

    const response = await GET(request());

    expect(response.status).toBe(429);
    expect(mocks.fetchSandboxResource).not.toHaveBeenCalled();
  });

  it("does not charge invalid catalog requests", async () => {
    mocks.resolveDownloadUrl.mockReturnValue(null);

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.fetchSandboxResource).not.toHaveBeenCalled();
  });

  it("refunds the unused reservation for a successful private response", async () => {
    const responseBody = new Uint8Array([1, 2, 3]);
    mocks.fetchSandboxResource.mockResolvedValue(
      new Response(responseBody, {
        status: 200,
        headers: { "content-type": "application/zip" },
      }),
    );

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(responseBody);
    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      50 * 1024 * 1024,
    );
    expect(mocks.refundByteBudget).toHaveBeenCalledWith(
      expect.any(Request),
      50 * 1024 * 1024,
      3,
    );
    expect(response.headers.get("cache-control")).toBe("private, max-age=3600");
    expect(response.headers.get("content-type")).toBe("application/zip");
  });

  it("keeps the reservation when the upstream body exceeds the response ceiling", async () => {
    mocks.fetchSandboxResource.mockResolvedValue(
      new Response(new Uint8Array(1), {
        status: 200,
        headers: { "content-length": String(50 * 1024 * 1024 + 1) },
      }),
    );

    const response = await GET(request());

    expect(response.status).toBe(413);
    expect(mocks.refundByteBudget).not.toHaveBeenCalled();
  });
});
