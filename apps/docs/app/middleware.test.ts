import type { RequestMiddlewareContext } from "@farm.js/core/middleware";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { middleware } from "./middleware";

const upstream = vi.fn<(url: URL, init: RequestInit) => Promise<Response>>();

beforeEach(() => {
  upstream.mockReset();
  upstream.mockResolvedValue(
    new Response("ok", {
      headers: { "content-encoding": "gzip", "content-length": "20" },
    }),
  );
  vi.stubGlobal("fetch", upstream);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const context = () =>
  ({ rewrite: vi.fn() }) as unknown as RequestMiddlewareContext;

const run = async (request: Request) =>
  (await middleware(request, context())) as Response | undefined;

describe("middleware", () => {
  it("preserves the legacy changelog redirect", async () => {
    const response = await run(
      new Request("https://www.assistant-ui.com/changelog?pkg=react&page=2"),
    );
    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe(
      "https://www.assistant-ui.com/changelog/react/2",
    );
  });

  it("preserves the retired analytics endpoint", async () => {
    const response = await run(
      new Request("https://www.assistant-ui.com/umami/api/send"),
    );
    expect(response?.status).toBe(204);
    expect(upstream).not.toHaveBeenCalled();
  });

  const analyticsRequest = (url: string, method = "POST") =>
    new Request(url, {
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
    const response = await run(analyticsRequest(url));

    expect(upstream).toHaveBeenCalledOnce();
    const [target, init] = upstream.mock.calls[0]!;
    expect(String(target)).toBe(destination);
    expect(init.method).toBe("POST");
    expect(await new Response(init.body).text()).toBe("{}");
    const sent = new Headers(init.headers);
    expect(sent.get("content-type")).toBe("application/json");
    for (const name of [
      "cookie",
      "authorization",
      "x-assistant-ui-anonymous-session",
      "referer",
      "x-custom",
    ]) {
      expect(sent.has(name)).toBe(false);
    }
    // fetch decoded the body, so the answer does not claim an encoding.
    expect(await response?.text()).toBe("ok");
    expect(response?.headers.has("content-encoding")).toBe(false);
    expect(response?.headers.has("content-length")).toBe(false);
  });

  it("serves the Umami tracker script", async () => {
    await run(
      analyticsRequest("https://www.assistant-ui.com/umami/script.js", "GET"),
    );
    const [target, init] = upstream.mock.calls[0]!;
    expect(String(target)).toBe(
      "https://assistant-ui-umami.vercel.app/script.js",
    );
    expect(init.body).toBeUndefined();
  });

  it.each([
    ["/ph//evil.example/e/", "https://us.i.posthog.com//evil.example/e/"],
    [
      "/ph/static//evil.example/array.js",
      "https://us-assets.i.posthog.com/static//evil.example/array.js",
    ],
  ])("keeps %s on the analytics host", async (path, destination) => {
    await run(analyticsRequest(`https://www.assistant-ui.com${path}`));
    expect(String(upstream.mock.calls[0]![0])).toBe(destination);
  });

  it.each([
    "/umami",
    "/umami/login",
    "/umami/api/auth/login",
    "/umami/websites",
  ])("does not serve the rest of the Umami app at %s", async (path) => {
    const response = await run(
      analyticsRequest(`https://www.assistant-ui.com${path}`, "GET"),
    );
    expect(response?.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("answers 502 when an analytics host cannot be reached", async () => {
    upstream.mockRejectedValueOnce(new TypeError("fetch failed"));
    const response = await run(
      analyticsRequest("https://www.assistant-ui.com/ph/e/"),
    );
    expect(response?.status).toBe(502);
  });
});
