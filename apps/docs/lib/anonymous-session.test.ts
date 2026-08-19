import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ANONYMOUS_SESSION_COOKIE,
  createAnonymousSessionToken,
  getAnonymousSession,
  isPublicAssistantBrowserRequest,
  requirePublicAssistantSession,
  verifyAnonymousSessionToken,
} from "./anonymous-session";

const secret = "test-secret-with-enough-entropy";
const browserHeaders = {
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("anonymous session tokens", () => {
  it("verifies an untampered, unexpired token", () => {
    const token = createAnonymousSessionToken({
      secret,
      id: "session_1234567890",
      now: 1_000,
    });

    expect(verifyAnonymousSessionToken({ token, secret, now: 2_000 })).toEqual({
      id: "session_1234567890",
      expiresAt: 86_401_000,
    });
  });

  it("rejects tampered and expired tokens", () => {
    const token = createAnonymousSessionToken({
      secret,
      id: "session_1234567890",
      now: 1_000,
    });

    expect(
      verifyAnonymousSessionToken({
        token: `${token.slice(0, -1)}x`,
        secret,
        now: 2_000,
      }),
    ).toBeNull();
    expect(
      verifyAnonymousSessionToken({ token, secret, now: 86_401_001 }),
    ).toBeNull();
  });

  it("reads a valid token from the HttpOnly cookie", () => {
    vi.stubEnv("AUI_ANONYMOUS_SESSION_SECRET", secret);
    const token = createAnonymousSessionToken({
      secret,
      id: "session_1234567890",
    });
    const request = new Request("https://www.assistant-ui.com/api/chat", {
      headers: {
        ...browserHeaders,
        cookie: `${ANONYMOUS_SESSION_COOKIE}=${token}`,
      },
    });

    expect(getAnonymousSession(request)?.id).toBe("session_1234567890");
  });
});

describe("public assistant browser boundary", () => {
  it("accepts the real same-origin GET shape without origin or referer", () => {
    const request = new Request("https://www.assistant-ui.com/api/chat", {
      headers: browserHeaders,
    });

    expect(isPublicAssistantBrowserRequest(request)).toBe(true);
  });

  it("accepts explicitly supported browser demos", () => {
    const request = new Request("https://www.assistant-ui.com/api/chat", {
      headers: {
        origin: "https://assistant-ui-expo.vercel.app",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
      },
    });

    expect(isPublicAssistantBrowserRequest(request)).toBe(true);
  });

  it("rejects raw curl-style requests and untrusted origins", () => {
    expect(
      isPublicAssistantBrowserRequest(
        new Request("https://www.assistant-ui.com/api/chat"),
      ),
    ).toBe(false);
    expect(
      isPublicAssistantBrowserRequest(
        new Request("https://www.assistant-ui.com/api/chat", {
          headers: {
            origin: "https://attacker.example",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
          },
        }),
      ),
    ).toBe(false);
  });

  it("rejects direct requests before checking a session token", () => {
    const result = requirePublicAssistantSession(
      new Request("https://www.assistant-ui.com/api/chat"),
    );

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });
});
