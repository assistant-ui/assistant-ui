import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "../proxy";

const request = (headers: Record<string, string>) =>
  new NextRequest("http://localhost/api/threads", { method: "POST", headers });

describe("proxy", () => {
  it("guards the thread routes", () => {
    expect(config.matcher).toBe("/api/threads/:path*");
  });

  it.each([
    { "sec-fetch-site": "cross-site" },
    { "sec-fetch-site": "same-site" },
    { origin: "https://evil.example" },
  ])("refuses a cross-origin call (%o)", (headers) => {
    expect(proxy(request(headers)).status).toBe(403);
  });

  it("lets the app's own calls through", () => {
    const response = proxy(request({ "sec-fetch-site": "same-origin" }));

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
