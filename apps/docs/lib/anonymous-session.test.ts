import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ANONYMOUS_SESSION_COOKIE,
  ANONYMOUS_SESSION_TTL_SECONDS,
  createAnonymousSessionToken,
  getAnonymousSession,
  requireAnonymousSession,
  verifyAnonymousSessionToken,
} from "./anonymous-session";

const secret = "test-secret-with-enough-entropy";
const id = "12345678-1234-4234-8234-123456789abc";
const now = Date.UTC(2026, 7, 18);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("anonymous session tokens", () => {
  it("round-trips a signed session", () => {
    const token = createAnonymousSessionToken({ secret, id, now });

    expect(verifyAnonymousSessionToken({ token, secret, now })).toEqual({
      id,
      expiresAt: now + ANONYMOUS_SESSION_TTL_SECONDS * 1000,
    });
  });

  it("rejects tampered and expired sessions", () => {
    const token = createAnonymousSessionToken({ secret, id, now });
    const [payload, signature] = token.split(".");

    expect(
      verifyAnonymousSessionToken({
        token: `${payload}x.${signature}`,
        secret,
        now,
      }),
    ).toBeNull();
    expect(
      verifyAnonymousSessionToken({
        token,
        secret,
        now: now + ANONYMOUS_SESSION_TTL_SECONDS * 1000,
      }),
    ).toBeNull();
  });

  it("reads the signed session from its HttpOnly cookie value", () => {
    vi.stubEnv("AUI_ANONYMOUS_SESSION_SECRET", secret);
    const token = createAnonymousSessionToken({ secret, id, now: Date.now() });
    const request = new Request("https://www.assistant-ui.com/docs", {
      headers: { cookie: `other=value; ${ANONYMOUS_SESSION_COOKIE}=${token}` },
    });

    expect(getAnonymousSession(request)?.id).toBe(id);
  });

  it("rejects requests without a valid session", async () => {
    vi.stubEnv("AUI_ANONYMOUS_SESSION_SECRET", secret);

    const result = requireAnonymousSession(
      new Request("https://www.assistant-ui.com/api/doc/chat"),
    );

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
    await expect((result as Response).json()).resolves.toEqual({
      error: "A valid anonymous session is required.",
    });
  });
});
