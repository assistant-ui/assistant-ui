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

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("anonymous session route", () => {
  it("mints a signed HttpOnly session", async () => {
    vi.stubEnv("AUI_ANONYMOUS_SESSION_SECRET", secret);
    mocks.checkIssuance.mockResolvedValue(null);

    const response = await GET(
      new Request("https://www.assistant-ui.com/api/anonymous-session"),
    );
    const payload = (await response.json()) as { token: string };

    expect(response.status).toBe(200);
    expect(
      verifyAnonymousSessionToken({ token: payload.token, secret }),
    ).not.toBeNull();
    expect(response.headers.get("set-cookie")).toContain(
      `${ANONYMOUS_SESSION_COOKIE}=`,
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
  });

  it("reuses an existing valid session without rotating it", async () => {
    vi.stubEnv("AUI_ANONYMOUS_SESSION_SECRET", secret);
    const token = createAnonymousSessionToken({ secret });

    const response = await GET(
      new Request("https://www.assistant-ui.com/api/anonymous-session", {
        headers: { cookie: `${ANONYMOUS_SESSION_COOKIE}=${token}` },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(mocks.checkIssuance).not.toHaveBeenCalled();
  });

  it("fails closed when the production signing secret is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUI_ANONYMOUS_SESSION_SECRET", "");

    const response = await GET(
      new Request("https://www.assistant-ui.com/api/anonymous-session"),
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
