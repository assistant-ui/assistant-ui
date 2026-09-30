import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const request = (headers?: HeadersInit) =>
  new NextRequest("http://localhost:3000/api/pi/threads", {
    method: "POST",
    ...(headers === undefined ? {} : { headers }),
    body: JSON.stringify({
      workspacePath: "/tmp/project",
      initialMessage: "Read the local files",
    }),
  });

describe("Pi API proxy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("hides the local control API in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(proxy(request()).status).toBe(404);
  });

  it("rejects cross-origin browser requests in development", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(
      proxy(
        request({
          "content-type": "text/plain",
          origin: "https://attacker.example",
          "sec-fetch-site": "cross-site",
        }),
      ).status,
    ).toBe(403);
  });

  it("allows same-origin browser requests in development", () => {
    vi.stubEnv("NODE_ENV", "development");

    const response = proxy(
      request({
        origin: "http://localhost:3000",
        "sec-fetch-site": "same-origin",
      }),
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("allows non-browser requests in development", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(proxy(request()).headers.get("x-middleware-next")).toBe("1");
  });
});
