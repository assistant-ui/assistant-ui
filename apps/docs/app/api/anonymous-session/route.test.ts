import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ANONYMOUS_SESSION_COOKIE,
  createAnonymousSessionToken,
  verifyAnonymousSessionToken,
} from "@/lib/anonymous-session";

const mocks = vi.hoisted(() => ({
  checkIssuance: vi.fn(),
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal()),
  checkAnonymousSessionIssuanceRateLimit: mocks.checkIssuance,
}));

import { GET, OPTIONS } from "./route";

const secret = "test-secret-with-enough-entropy";
const browserHeaders = {
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("anonymous session route", () => {
  it("rejects a direct curl-style request", async () => {
    const response = await GET(
      new Request("https://www.assistant-ui.com/api/anonymous-session"),
    );

    expect(response.status).toBe(403);
    expect(mocks.checkIssuance).not.toHaveBeenCalled();
  });

  it("mints a signed HttpOnly cookie for the website", async () => {
    vi.stubEnv("AUI_ANONYMOUS_SESSION_SECRET", secret);
    mocks.checkIssuance.mockResolvedValue(null);

    const response = await GET(
      new Request("https://www.assistant-ui.com/api/anonymous-session", {
        headers: browserHeaders,
      }),
    );
    const setCookie = response.headers.get("set-cookie") ?? "";
    const token = setCookie
      .split(";")[0]
      ?.slice(`${ANONYMOUS_SESSION_COOKIE}=`.length);

    expect(response.status).toBe(204);
    expect(token).toBeTruthy();
    expect(
      verifyAnonymousSessionToken({ token: token!, secret }),
    ).not.toBeNull();
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=lax");
  });

  it("reuses an existing valid session without rotating it", async () => {
    vi.stubEnv("AUI_ANONYMOUS_SESSION_SECRET", secret);
    const token = createAnonymousSessionToken({ secret });

    const response = await GET(
      new Request("https://www.assistant-ui.com/api/anonymous-session", {
        headers: {
          ...browserHeaders,
          cookie: `${ANONYMOUS_SESSION_COOKIE}=${token}`,
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(mocks.checkIssuance).not.toHaveBeenCalled();
  });

  it("returns a header token only to a supported cross-origin browser", async () => {
    vi.stubEnv("AUI_ANONYMOUS_SESSION_SECRET", secret);
    mocks.checkIssuance.mockResolvedValue(null);

    const response = await GET(
      new Request("https://www.assistant-ui.com/api/anonymous-session", {
        headers: {
          origin: "https://assistant-ui-ink.vercel.app",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
        },
      }),
    );
    const body = (await response.json()) as { token: string };

    expect(response.status).toBe(200);
    expect(
      verifyAnonymousSessionToken({ token: body.token, secret }),
    ).not.toBeNull();
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://assistant-ui-ink.vercel.app",
    );
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("fails closed when the production signing secret is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUI_ANONYMOUS_SESSION_SECRET", "");

    const response = await GET(
      new Request("https://www.assistant-ui.com/api/anonymous-session", {
        headers: browserHeaders,
      }),
    );

    expect(response.status).toBe(503);
  });

  it("returns CORS headers only to supported clients", () => {
    const allowed = OPTIONS(
      new Request("https://www.assistant-ui.com/api/anonymous-session", {
        headers: { origin: "https://assistant-ui-ink.vercel.app" },
      }),
    );
    const untrusted = OPTIONS(
      new Request("https://www.assistant-ui.com/api/anonymous-session", {
        headers: { origin: "https://attacker.example" },
      }),
    );

    expect(allowed.headers.get("access-control-allow-origin")).toBe(
      "https://assistant-ui-ink.vercel.app",
    );
    expect(untrusted.headers.get("access-control-allow-origin")).toBeNull();
  });
});
