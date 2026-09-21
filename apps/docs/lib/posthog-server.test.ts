import { afterEach, describe, expect, it, vi } from "vitest";

import { getDistinctId } from "./posthog-server";

const withIp = (ip: string) =>
  new Request("https://www.assistant-ui.com/api/chat", {
    headers: { "x-forwarded-for": ip },
  });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("analytics distinct id", () => {
  it("prefers the posthog cookie the browser already carries", () => {
    const request = new Request("https://www.assistant-ui.com/api/chat", {
      headers: {
        cookie: `ph_key_posthog=${encodeURIComponent(
          JSON.stringify({ distinct_id: "person_1" }),
        )}`,
      },
    });

    expect(getDistinctId(request)).toBe("person_1");
  });

  it("never derives an identity from an address without a real key", () => {
    vi.stubEnv("AUI_ANONYMOUS_SESSION_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");

    expect(getDistinctId(withIp("203.0.113.7"))).toBe("anon_unknown");
  });

  it("pseudonymizes the address once a key is configured", () => {
    vi.stubEnv("AUI_ANONYMOUS_SESSION_SECRET", "a-secret-with-enough-entropy");

    const id = getDistinctId(withIp("203.0.113.7"));

    expect(id).toMatch(/^anon_[\w-]{24}$/);
    expect(id).not.toContain("203.0.113.7");
    expect(getDistinctId(withIp("203.0.113.7"))).toBe(id);
    expect(getDistinctId(withIp("203.0.113.8"))).not.toBe(id);
  });

  it("hashes the client hop rather than the whole proxy chain", () => {
    vi.stubEnv("AUI_ANONYMOUS_SESSION_SECRET", "a-secret-with-enough-entropy");

    expect(
      getDistinctId(withIp("203.0.113.7, 70.41.3.18, 150.172.238.178")),
    ).toBe(getDistinctId(withIp("203.0.113.7")));
  });

  it("stays anonymous when the platform sends no address", () => {
    vi.stubEnv("AUI_ANONYMOUS_SESSION_SECRET", "a-secret-with-enough-entropy");

    expect(
      getDistinctId(new Request("https://www.assistant-ui.com/api/chat")),
    ).toBe("anon_unknown");
  });
});
