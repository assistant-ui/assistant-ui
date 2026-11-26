import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

const { captureAgentEvent } = await vi.hoisted(async () => {
  // Next's server runtime installs this global, and `after` reads it on import.
  const { AsyncLocalStorage } = await import("node:async_hooks");
  Object.assign(globalThis, { AsyncLocalStorage });
  return { captureAgentEvent: vi.fn() };
});

vi.mock("@/lib/agent-telemetry", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/agent-telemetry")>()),
  captureAgentEvent,
}));

import { config, proxy } from "./proxy";

describe("proxy", () => {
  it("preserves the legacy changelog redirect", async () => {
    const response = await proxy(
      new NextRequest(
        "https://www.assistant-ui.com/changelog?pkg=react&page=2",
      ),
    );
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://www.assistant-ui.com/changelog/react/2",
    );
  });

  it("preserves the retired analytics endpoint", async () => {
    expect(
      (
        await proxy(
          new NextRequest("https://www.assistant-ui.com/umami/api/send"),
        )
      ).status,
    ).toBe(204);
  });

  const analyticsRequest = (url: string, method = "POST") =>
    new NextRequest(url, {
      method,
      headers: {
        cookie: "__Host-aui.at=token; aui_anon_session=session; ph_x=1",
        authorization: "Bearer token",
        "x-assistant-ui-anonymous-session": "session",
        "content-type": "application/json",
        referer: "https://www.assistant-ui.com/private?token=x",
        "x-custom": "value",
      },
      ...(method === "POST" ? { body: "{}" } : {}),
    });

  it.each([
    [
      "https://www.assistant-ui.com/ph/e/?ip=0&ver=1",
      "https://us.i.posthog.com/e/?ip=0&ver=1",
    ],
    [
      "https://www.assistant-ui.com/ph/static/array.js",
      "https://us-assets.i.posthog.com/static/array.js",
    ],
    [
      "https://www.assistant-ui.com/umami/api/send",
      "https://assistant-ui-umami.vercel.app/api/send",
    ],
  ])("proxies %s without the visitor's cookies", async (url, destination) => {
    const response = await proxy(analyticsRequest(url));

    expect(response.headers.get("x-middleware-rewrite")).toBe(destination);
    const overridden = (
      response.headers.get("x-middleware-override-headers") ?? ""
    ).split(",");
    expect(overridden).toContain("content-type");
    for (const name of [
      "cookie",
      "authorization",
      "x-assistant-ui-anonymous-session",
      "referer",
      "x-custom",
    ]) {
      expect(overridden).not.toContain(name);
      expect(response.headers.has(`x-middleware-request-${name}`)).toBe(false);
    }
  });

  it("serves the Umami tracker script", async () => {
    const response = await proxy(
      analyticsRequest("https://www.assistant-ui.com/umami/script.js", "GET"),
    );
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://assistant-ui-umami.vercel.app/script.js",
    );
  });

  it.each([
    ["/ph//evil.example/e/", "https://us.i.posthog.com//evil.example/e/"],
    [
      "/ph/static//evil.example/array.js",
      "https://us-assets.i.posthog.com/static//evil.example/array.js",
    ],
  ])("keeps %s on the analytics host", async (path, destination) => {
    const response = await proxy(
      analyticsRequest(`https://www.assistant-ui.com${path}`),
    );
    expect(response.headers.get("x-middleware-rewrite")).toBe(destination);
  });

  it.each([
    "/umami",
    "/umami/login",
    "/umami/api/auth/login",
    "/umami/websites",
  ])("does not serve the rest of the Umami app at %s", async (path) => {
    const response = await proxy(
      analyticsRequest(`https://www.assistant-ui.com${path}`, "GET"),
    );
    expect(response.status).toBe(404);
    expect(response.headers.has("x-middleware-rewrite")).toBe(false);
  });
});

describe("agent reads", () => {
  beforeEach(() => {
    captureAgentEvent.mockClear();
  });

  const matches = (url: string, headers?: Record<string, string>) =>
    unstable_doesMiddlewareMatch({
      config,
      url: `https://www.assistant-ui.com${url}`,
      ...(headers ? { headers } : {}),
    });

  it.each([
    "/llms.txt",
    "/llms-full.txt",
    "/skill.md",
    "/docs/runtimes/ag-ui/overview.md",
    "/docs/installation.mdx",
    "/.well-known/agent-skills/index.json",
  ])("runs before the CDN cache for %s", (url) => {
    expect(matches(url)).toBe(true);
  });

  it("runs for a page fetched as markdown, but not for a page opened in a browser", () => {
    expect(matches("/docs/installation", { accept: "text/markdown" })).toBe(
      true,
    );
    expect(
      matches("/docs/installation", {
        accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      }),
    ).toBe(false);
  });

  it("counts a markdown fetch by path and client, with no identity", async () => {
    const response = await proxy(
      new NextRequest("https://www.assistant-ui.com/docs/installation.md", {
        headers: {
          "user-agent": "Claude-User (claude-code/2.1.332)",
          "x-vercel-ip-country": "US",
          "x-forwarded-for": "203.0.113.9",
        },
      }),
    );
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(captureAgentEvent).toHaveBeenCalledWith(
      expect.any(Headers),
      "agent_docs_fetched",
      {
        kind: "markdown",
        path: "/docs/installation.md",
        negotiated: false,
        method: "GET",
        client: "claude-code",
      },
    );
  });

  it("leaves search crawlers out", async () => {
    await proxy(
      new NextRequest("https://www.assistant-ui.com/llms.txt", {
        headers: { "user-agent": "Mozilla/5.0 (compatible; bingbot/2.0)" },
      }),
    );
    expect(captureAgentEvent).not.toHaveBeenCalled();
  });

  it("does not count the other requests it handles", async () => {
    await proxy(
      new NextRequest("https://www.assistant-ui.com/changelog?pkg=react"),
    );
    expect(captureAgentEvent).not.toHaveBeenCalled();
  });
});
