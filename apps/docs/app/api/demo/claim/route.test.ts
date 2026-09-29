import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  accountCloud: vi.fn(),
  claim: vi.fn(),
  getAnonymousSession: vi.fn(),
  mergeConversations: vi.fn(),
}));

vi.mock("@/lib/accounts-auth", () => ({
  getSession: mocks.getSession,
}));

vi.mock("@/lib/account-cloud", () => ({
  accountCloud: mocks.accountCloud,
}));

vi.mock("@/lib/anonymous-session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/anonymous-session")>()),
  getAnonymousSession: mocks.getAnonymousSession,
}));

vi.mock("@/lib/demo-usage", () => ({
  mergeConversations: mocks.mergeConversations,
}));

import { POST } from "./route";

const request = (
  body: BodyInit = JSON.stringify({ refresh_token: "anonymous-refresh" }),
  headers: HeadersInit = {},
) =>
  new Request("https://www.assistant-ui.com/api/demo/claim", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      ...headers,
    },
    body,
  });

const configureAccountCloud = () => {
  mocks.getSession.mockResolvedValue({ user: { id: "user-1" } });
  mocks.accountCloud.mockReturnValue({ threads: { claim: mocks.claim } });
};

afterEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/demo/claim", () => {
  it("rejects cross-origin requests", async () => {
    const response = await POST(
      request(JSON.stringify({ refresh_token: "anonymous-refresh" }), {
        origin: "https://example.com",
        "sec-fetch-site": "cross-site",
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it("rejects requests without fetch metadata or an origin", async () => {
    const response = await POST(
      new Request("https://www.assistant-ui.com/api/demo/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refresh_token: "anonymous-refresh" }),
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it("requires a signed-in session", async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(mocks.accountCloud).not.toHaveBeenCalled();
  });

  it("rejects an invalid claim body", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } });

    const response = await POST(request(JSON.stringify({ refresh_token: 1 })));

    expect(response.status).toBe(400);
    expect(mocks.accountCloud).not.toHaveBeenCalled();
  });

  it("reports an unconfigured account cloud", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.accountCloud.mockReturnValue(null);

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(mocks.accountCloud).toHaveBeenCalledWith("user-1");
  });

  it("translates an Assistant Cloud claim failure to a bad gateway", async () => {
    configureAccountCloud();
    mocks.claim.mockRejectedValue(new Error("cloud unavailable"));

    const response = await POST(request());

    expect(response.status).toBe(502);
    expect(mocks.getAnonymousSession).not.toHaveBeenCalled();
  });

  it("returns the moved threads without caching", async () => {
    configureAccountCloud();
    mocks.claim.mockResolvedValue({ moved: 2 });
    mocks.getAnonymousSession.mockReturnValue(null);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ moved: 2 });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.claim).toHaveBeenCalledWith({
      refresh_token: "anonymous-refresh",
    });
    expect(mocks.mergeConversations).not.toHaveBeenCalled();
  });

  it("merges the anonymous cookie day into the signed-in user day", async () => {
    configureAccountCloud();
    mocks.claim.mockResolvedValue({ moved: 1 });
    mocks.getAnonymousSession.mockReturnValue({
      id: "anonymous-session-123",
      expiresAt: Date.now() + 60_000,
    });
    const claimRequest = request(undefined, {
      cookie: "aui_anon_session=signed-cookie",
    });

    await POST(claimRequest);

    expect(mocks.getAnonymousSession).toHaveBeenCalledWith(claimRequest);
    expect(mocks.mergeConversations).toHaveBeenCalledWith(
      "anon:anonymous-session-123",
      "user:user-1",
    );
  });
});
