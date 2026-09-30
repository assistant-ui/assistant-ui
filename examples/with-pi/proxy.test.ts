import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const request = (
  headers?: HeadersInit,
  url = "http://localhost:3000/api/pi/threads",
) =>
  new NextRequest(url, {
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

  it.each(["production", "test"])(
    "hides the local control API in %s",
    (environment) => {
      vi.stubEnv("NODE_ENV", environment);

      expect(proxy(request()).status).toBe(404);
    },
  );

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

  it("rejects same-origin requests addressed to a non-loopback host", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(
      proxy(
        request(
          {
            origin: "http://attacker.example:3000",
            "sec-fetch-site": "same-origin",
          },
          "http://attacker.example:3000/api/pi/threads",
        ),
      ).status,
    ).toBe(403);
  });

  it("allows non-browser requests in development", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(proxy(request()).headers.get("x-middleware-next")).toBe("1");
  });
});
