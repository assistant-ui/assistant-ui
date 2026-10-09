import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  accountCloud: vi.fn(),
  createToken: vi.fn(),
}));

vi.mock("@/lib/accounts-auth", () => ({
  getSession: mocks.getSession,
}));

vi.mock("@/lib/account-cloud", () => ({
  accountCloud: mocks.accountCloud,
}));

import { GET } from "./route";

const request = (headers: HeadersInit = { "sec-fetch-site": "same-origin" }) =>
  new Request("https://www.assistant-ui.com/api/assistant-token", { headers });

afterEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/assistant-token", () => {
  it("rejects cross-origin requests", async () => {
    const response = await GET(
      request({
        origin: "https://example.com",
        "sec-fetch-site": "cross-site",
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it("requires a signed-in session", async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "A signed-in session is required.",
    });
  });

  it("reports an unconfigured account cloud", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.accountCloud.mockReturnValue(null);

    const response = await GET(request());

    expect(response.status).toBe(503);
    expect(mocks.accountCloud).toHaveBeenCalledWith("user-1");
  });

  it("returns a no-store token for the signed-in workspace", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.createToken.mockResolvedValue({ token: "cloud-token" });
    mocks.accountCloud.mockReturnValue({
      auth: { tokens: { create: mocks.createToken } },
    });

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ token: "cloud-token" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.accountCloud).toHaveBeenCalledWith("user-1");
    expect(mocks.createToken).toHaveBeenCalledOnce();
  });

  it("translates an Assistant Cloud token failure to a bad gateway", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.createToken.mockRejectedValue(new Error("cloud unavailable"));
    mocks.accountCloud.mockReturnValue({
      auth: { tokens: { create: mocks.createToken } },
    });

    const response = await GET(request());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Assistant Cloud could not mint an account token.",
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
