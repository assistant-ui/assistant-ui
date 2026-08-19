import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAiBuilderUser: vi.fn(),
  checkDownloadRateLimit: vi.fn(),
  requireXuluxSessionOwner: vi.fn(),
  exportWorkspaceArchive: vi.fn(),
}));

vi.mock("@/lib/feature-flags", async (importOriginal) => ({
  ...(await importOriginal()),
  isAiPlaygroundEnabled: true,
}));

vi.mock("@/lib/ai-builder-auth", async (importOriginal) => ({
  ...(await importOriginal()),
  requireAiBuilderUser: mocks.requireAiBuilderUser,
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal()),
  checkDownloadRateLimit: mocks.checkDownloadRateLimit,
}));

vi.mock("@/lib/xulux/session-owner", async (importOriginal) => ({
  ...(await importOriginal()),
  requireXuluxSessionOwner: mocks.requireXuluxSessionOwner,
}));

vi.mock("../blaxel-sandbox", async (importOriginal) => ({
  ...(await importOriginal()),
  exportWorkspaceArchive: mocks.exportWorkspaceArchive,
}));

import { POST } from "./route";

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/xulux/download access boundary", () => {
  it("requires Clerk auth before download work", async () => {
    mocks.requireAiBuilderUser.mockResolvedValue(
      Response.json({ error: "Unauthorized." }, { status: 401 }),
    );

    const response = await POST(
      new Request("https://www.assistant-ui.com/api/xulux/download", {
        method: "POST",
        body: JSON.stringify({ sessionId: "session_123" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.checkDownloadRateLimit).not.toHaveBeenCalled();
    expect(mocks.exportWorkspaceArchive).not.toHaveBeenCalled();
  });

  it("uses the authenticated download quota instead of inference quota", async () => {
    mocks.requireAiBuilderUser.mockResolvedValue({ userId: "user_123" });
    mocks.checkDownloadRateLimit.mockResolvedValue(
      new Response("limited", { status: 429 }),
    );

    const request = new Request(
      "https://www.assistant-ui.com/api/xulux/download",
      {
        method: "POST",
        body: JSON.stringify({ sessionId: "session_123" }),
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(mocks.checkDownloadRateLimit).toHaveBeenCalledWith(
      request,
      "user:user_123",
    );
    expect(mocks.exportWorkspaceArchive).not.toHaveBeenCalled();
  });

  it("rejects a session owned by another user before export", async () => {
    mocks.requireAiBuilderUser.mockResolvedValue({ userId: "user_123" });
    mocks.checkDownloadRateLimit.mockResolvedValue(null);
    mocks.requireXuluxSessionOwner.mockReturnValue(
      Response.json({ error: "Forbidden" }, { status: 403 }),
    );

    const request = new Request(
      "https://www.assistant-ui.com/api/xulux/download",
      {
        method: "POST",
        body: JSON.stringify({ sessionId: "session_123" }),
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(mocks.requireXuluxSessionOwner).toHaveBeenCalledWith(
      "session_123",
      "user_123",
    );
    expect(mocks.exportWorkspaceArchive).not.toHaveBeenCalled();
  });
});
