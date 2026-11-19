import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

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
