import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: null as { core: { resolve: ReturnType<typeof vi.fn> } } | null,
  connection: vi.fn(() => Promise.resolve()),
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: mocks.connection,
}));

// accounts-auth reads aui.json and the request scope behind a server-only
// guard, so this mock replaces the module rather than spreading it.
vi.mock("@/lib/accounts-auth", () => ({
  docsAuth: () => mocks.auth,
}));

import { GET } from "./route";

const user = {
  id: "user_1",
  name: "Harry Yep",
  email: "harry@assistant-ui.com",
  image: null,
};

const request = (headers: HeadersInit = {}) =>
  new NextRequest("https://www.assistant-ui.com/api/auth/session", { headers });

const configured = (resolution: { session: unknown; cookies: string[] }) => {
  const resolve = vi.fn().mockResolvedValue({
    session: resolution.session,
    setCookies: resolution.cookies,
    refused: false,
  });
  mocks.auth = { core: { resolve } };
  return { resolveSession: resolve };
};

beforeEach(() => {
  mocks.auth = null;
  delete process.env.ASSISTANT_API_KEY;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/auth/session", () => {
  it("waits for a request before answering, so a build cannot freeze its answer", async () => {
    mocks.connection.mockReturnValueOnce(new Promise<void>(() => {}));
    const answered = vi.fn();

    void GET(request()).then(answered);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(answered).not.toHaveBeenCalled();
  });

  it("lets only the setup app read the session across origins", async () => {
    const setup = await GET(
      request({
        origin: "https://setup.assistant-ui.com",
        "sec-fetch-site": "same-site",
      }),
    );
    expect(setup.headers.get("access-control-allow-origin")).toBe(
      "https://setup.assistant-ui.com",
    );
    expect(setup.headers.get("access-control-allow-credentials")).toBe("true");
    const other = await GET(
      request({
        origin: "https://example.com",
        "sec-fetch-site": "cross-site",
      }),
    );
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("offers nothing on a deployment that carries no accounts configuration", async () => {
    const response = await GET(request());

    expect(await response.json()).toEqual({
      enabled: false,
      cloudHistory: false,
      user: null,
    });
  });

  it("reports the signed-in visitor and hands back the cookies the refresh issued", async () => {
    process.env.ASSISTANT_API_KEY = "key";
    const accounts = configured({
      session: { user },
      cookies: ["a=1; Path=/", "b=2; Path=/"],
    });

    const response = await GET(request());

    expect(accounts.resolveSession).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual({
      enabled: true,
      cloudHistory: true,
      user: {
        analyticsId: expect.stringMatching(/^u_[\w-]{32}$/),
        name: user.name,
        email: user.email,
        image: null,
      },
    });
    expect(response.headers.getSetCookie()).toEqual([
      "a=1; Path=/",
      "b=2; Path=/",
    ]);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("identifies the visitor to analytics by a keyed hash, never the account id", async () => {
    vi.stubEnv("AUI_ANONYMOUS_SESSION_SECRET", "a-secret-with-enough-entropy");
    configured({ session: { user }, cookies: [] });
    const first = (await (await GET(request())).json()).user.analyticsId;

    configured({ session: { user }, cookies: [] });
    const again = (await (await GET(request())).json()).user.analyticsId;

    configured({ session: { user: { ...user, id: "user_2" } }, cookies: [] });
    const other = (await (await GET(request())).json()).user.analyticsId;

    expect(first).not.toContain(user.id);
    expect(again).toBe(first);
    expect(other).not.toBe(first);
  });

  it("leaves the visitor unidentified when production has no secret", async () => {
    vi.stubEnv("AUI_ANONYMOUS_SESSION_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    configured({ session: { user }, cookies: [] });

    const response = await GET(request());

    expect((await response.json()).user.analyticsId).toBeNull();
  });

  it("still hands back the cookies that clear a session that is gone", async () => {
    configured({ session: null, cookies: ["gone=; Max-Age=0"] });

    const response = await GET(request());

    expect(await response.json()).toMatchObject({ enabled: true, user: null });
    expect(response.headers.getSetCookie()).toEqual(["gone=; Max-Age=0"]);
  });

  it("answers as a signed-out visitor when the session cannot be resolved", async () => {
    mocks.auth = {
      core: {
        resolve: vi.fn().mockRejectedValue(new Error("accounts is down")),
      },
    };

    const response = await GET(request());

    expect(await response.json()).toMatchObject({ enabled: true, user: null });
    expect(response.headers.getSetCookie()).toEqual([]);
  });
});
