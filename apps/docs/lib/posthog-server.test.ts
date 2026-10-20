import { afterEach, describe, expect, it, vi } from "vitest";

import { getDistinctId } from "./posthog-server";

const posthog = vi.hoisted(() => ({
  captureExceptionImmediate: vi.fn(async () => {}),
  options: undefined as import("posthog-node").PostHogOptions | undefined,
}));

vi.mock("posthog-node", async (importOriginal) => ({
  ...(await importOriginal<typeof import("posthog-node")>()),
  PostHog: class {
    captureExceptionImmediate = posthog.captureExceptionImmediate;
    constructor(_key: string, options: import("posthog-node").PostHogOptions) {
      posthog.options = options;
    }
  },
}));

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

  it("keeps a signed-in visitor's account pseudonym off AI logs", () => {
    vi.stubEnv("AUI_ANONYMOUS_SESSION_SECRET", "a-secret-with-enough-entropy");
    const request = new Request("https://www.assistant-ui.com/api/chat", {
      headers: {
        cookie: `ph_key_posthog=${encodeURIComponent(
          JSON.stringify({ distinct_id: "u_pseudonym" }),
        )}`,
        "x-forwarded-for": "203.0.113.7",
      },
    });

    expect(getDistinctId(request)).toBe(getDistinctId(withIp("203.0.113.7")));
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

describe("server request errors", () => {
  const loadWithKey = async (key: string) => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_API_KEY", key);
    return import("./posthog-server");
  };

  const US = { "x-vercel-ip-country": "US" };

  const context = {
    routerKind: "App Router",
    routePath: "/api/chat",
    routeType: "route",
    revalidateReason: undefined,
  } as const;

  it("reports nothing without a project key", async () => {
    const { captureRequestError } = await loadWithKey("");

    await captureRequestError(
      new Error("boom"),
      { path: "/api/chat", method: "POST", headers: US },
      context,
    );

    expect(posthog.captureExceptionImmediate).not.toHaveBeenCalled();
  });

  it("reports the error with the path, method, and route only", async () => {
    const { captureRequestError } = await loadWithKey("phc_test");
    const error = Object.assign(new Error("boom"), { digest: "123" });

    await captureRequestError(
      error,
      {
        path: "/docs/runtimes?q=private",
        method: "GET",
        headers: {
          cookie: `ph_phc_test_posthog=${encodeURIComponent(
            JSON.stringify({ distinct_id: "person_1" }),
          )}`,
          authorization: "Bearer secret",
          "user-agent": "agent",
          ...US,
        },
      },
      {
        routerKind: "App Router",
        routePath: "/docs/[[...slug]]",
        routeType: "render",
        renderSource: "react-server-components",
        revalidateReason: undefined,
      },
    );

    expect(posthog.captureExceptionImmediate).toHaveBeenCalledExactlyOnceWith(
      error,
      "docs-server",
      {
        $process_person_profile: false,
        path: "/docs/runtimes",
        method: "GET",
        router_kind: "App Router",
        route_path: "/docs/[[...slug]]",
        route_type: "render",
        render_source: "react-server-components",
        digest: "123",
      },
    );
  });

  it("sends no visitor identity, even with an address and a secret", async () => {
    vi.stubEnv("AUI_ANONYMOUS_SESSION_SECRET", "a-secret-with-enough-entropy");
    const { captureRequestError } = await loadWithKey("phc_test");

    await captureRequestError(
      "thrown string",
      {
        path: "/api/chat",
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.7, 70.41.3.18", ...US },
      },
      context,
    );

    expect(posthog.captureExceptionImmediate).toHaveBeenCalledExactlyOnceWith(
      "thrown string",
      "docs-server",
      expect.objectContaining({ path: "/api/chat", method: "POST" }),
    );
  });

  it("honors a GPC signal", async () => {
    const { captureRequestError } = await loadWithKey("phc_test");

    await captureRequestError(
      new Error("boom"),
      { path: "/api/chat", method: "POST", headers: { ...US, "sec-gpc": "1" } },
      context,
    );

    expect(posthog.captureExceptionImmediate).not.toHaveBeenCalled();
  });

  it("reports nothing from an opt-in region or an unknown one", async () => {
    const { captureRequestError } = await loadWithKey("phc_test");

    for (const headers of [{ "x-vercel-ip-country": "DE" }, {}]) {
      await captureRequestError(
        new Error("boom"),
        { path: "/api/chat", method: "POST", headers },
        context,
      );
    }

    expect(posthog.captureExceptionImmediate).not.toHaveBeenCalled();
  });

  it("sends an exception's type in place of its message", async () => {
    await loadWithKey("phc_test");
    const beforeSend = posthog.options?.before_send;
    if (typeof beforeSend !== "function") throw new Error("no before_send");
    const frames = [{ filename: "route.js", lineno: 1 }];

    const sent = beforeSend({
      event: "$exception",
      distinctId: "docs-server",
      properties: {
        path: "/api/chat",
        $exception_list: [
          {
            type: "SyntaxError",
            value: `Unexpected token 'h', "hello there" is not valid JSON`,
            stacktrace: { type: "raw", frames },
          },
        ],
      },
    });

    expect(sent?.properties).toEqual({
      path: "/api/chat",
      $exception_list: [
        {
          type: "SyntaxError",
          value: "SyntaxError",
          stacktrace: { type: "raw", frames },
        },
      ],
    });
  });
});
