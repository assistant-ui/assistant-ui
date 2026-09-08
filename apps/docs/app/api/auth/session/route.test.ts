import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  accounts: null as { resolveSession: ReturnType<typeof vi.fn> } | null,
}));

// accounts-auth reaches Upstash and the accounts client behind a server-only
// guard, so this mock replaces the module rather than spreading it.
vi.mock("@/lib/accounts-auth", () => ({
  get accounts() {
    return mocks.accounts;
  },
}));

import { GET } from "./route";

const user = {
  id: "user_1",
  name: "Harry Yep",
  email: "harry@assistant-ui.com",
  image: null,
};

const request = () =>
  new NextRequest("https://www.assistant-ui.com/api/auth/session");

const configured = (resolution: { session: unknown; cookies: string[] }) => {
  mocks.accounts = { resolveSession: vi.fn().mockResolvedValue(resolution) };
  return mocks.accounts;
};

beforeEach(() => {
  mocks.accounts = null;
  delete process.env.ASSISTANT_API_KEY;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/auth/session", () => {
  it("offers nothing on a deployment that carries no accounts configuration", async () => {
    const response = await GET(request());

    expect(await response.json()).toEqual({
      enabled: false,
      cloudHistory: false,
      user: null,
    });
  });

  it("reports the signed-in visitor and hands back the cookies the resolver issued", async () => {
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
      user: { name: user.name, email: user.email, image: null },
    });
    expect(response.headers.getSetCookie()).toEqual([
      "a=1; Path=/",
      "b=2; Path=/",
    ]);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("still hands back the cookies that clear a session that is gone", async () => {
    configured({ session: null, cookies: ["gone=; Max-Age=0"] });

    const response = await GET(request());

    expect(await response.json()).toMatchObject({ enabled: true, user: null });
    expect(response.headers.getSetCookie()).toEqual(["gone=; Max-Age=0"]);
  });

  it("answers as a signed-out visitor when the session cannot be resolved", async () => {
    mocks.accounts = {
      resolveSession: vi.fn().mockRejectedValue(new Error("store is down")),
    };

    const response = await GET(request());

    expect(await response.json()).toMatchObject({ enabled: true, user: null });
    expect(response.headers.getSetCookie()).toEqual([]);
  });
});
