import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, OPTIONS, POST } from "./route";

beforeEach(() => {
  vi.stubEnv("APP_ORIGIN", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("LangGraph proxy", () => {
  it("rejects cross-origin browser requests before contacting LangGraph", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("https://app.example/api/threads", {
        method: "POST",
        headers: { origin: "https://attacker.example" },
        body: "{}",
      }),
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects cross-scheme origins without a configured public origin", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("https://app.example/api/threads", {
        method: "POST",
        headers: { origin: "http://app.example" },
        body: "{}",
      }),
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a configured public origin behind a proxy", async () => {
    vi.stubEnv("APP_ORIGIN", "https://app.example");
    vi.stubEnv("LANGGRAPH_API_URL", "https://agent.example");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({}));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("http://app.internal/api/threads", {
        method: "POST",
        headers: {
          host: "app.internal",
          origin: "https://app.example",
        },
        body: "{}",
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("reports an invalid configured public origin", async () => {
    vi.stubEnv("APP_ORIGIN", "app.example");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("http://app.internal/api/threads", {
        method: "POST",
        headers: { origin: "https://app.example" },
        body: "{}",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "APP_ORIGIN must be an absolute HTTP(S) origin.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves same-origin proxy requests without exposing CORS or cookies", async () => {
    vi.stubEnv("LANGGRAPH_API_URL", "https://agent.example");
    vi.stubEnv("LANGCHAIN_API_KEY", "secret-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"thread_id":"thread-1"}', {
        headers: {
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Headers": "x-api-key",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
          "Set-Cookie": "upstream=value",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("http://app.internal/api/threads?_path=threads&limit=1", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          origin: "https://app.example",
          "sec-fetch-site": "same-origin",
        },
        body: "{}",
      }),
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://agent.example/threads?limit=1");
    expect(init.method).toBe("POST");
    expect(init.body).toBe("{}");
    expect(new Headers(init.headers).get("x-api-key")).toBe("secret-key");
    expect(new Headers(init.headers).get("content-type")).toBe(
      "application/json",
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    expect(response.headers.get("access-control-allow-headers")).toBeNull();
    expect(response.headers.get("access-control-allow-methods")).toBeNull();
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("fails closed when the upstream URL is missing", async () => {
    vi.stubEnv("LANGGRAPH_API_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("https://app.example/api/threads", {
        method: "POST",
        headers: { origin: "https://app.example" },
        body: "{}",
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "LANGGRAPH_API_URL is not configured.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects upstream redirects without exposing their location", async () => {
    vi.stubEnv("LANGGRAPH_API_URL", "https://agent.example");
    vi.stubEnv("LANGCHAIN_API_KEY", "secret-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 307,
        headers: { location: "https://redirect.example/threads" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("https://app.example/api/threads", {
        method: "POST",
        headers: {
          origin: "https://app.example",
          "sec-fetch-site": "same-origin",
        },
        body: "{}",
      }),
    );

    expect(response.status).toBe(502);
    expect(response.headers.get("location")).toBeNull();
    await expect(response.json()).resolves.toEqual({
      error: "LangGraph returned an unexpected redirect.",
    });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.redirect).toBe("manual");
  });

  it("preserves non-redirect 304 responses", async () => {
    vi.stubEnv("LANGGRAPH_API_URL", "https://agent.example");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 304 })),
    );

    const response = await GET(
      new NextRequest("https://app.example/api/threads", {
        headers: {
          origin: "https://app.example",
          "sec-fetch-site": "same-origin",
        },
      }),
    );

    expect(response.status).toBe(304);
  });

  it("does not approve cross-origin preflight requests", async () => {
    const response = OPTIONS(
      new NextRequest("https://app.example/api/threads", {
        method: "OPTIONS",
        headers: {
          origin: "https://attacker.example",
          "sec-fetch-site": "cross-site",
        },
      }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });
});
