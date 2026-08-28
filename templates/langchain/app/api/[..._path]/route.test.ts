import { afterEach, describe, expect, it, vi } from "vitest";
import { OPTIONS, POST } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("LangGraph proxy", () => {
  it("rejects cross-origin browser requests before contacting LangGraph", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("https://app.example/api/threads", {
        method: "POST",
        headers: { origin: "https://attacker.example" },
        body: "{}",
      }),
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves same-origin proxy requests without exposing CORS or cookies", async () => {
    vi.stubEnv("LANGGRAPH_API_URL", "https://agent.example");
    vi.stubEnv("LANGCHAIN_API_KEY", "secret-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"thread_id":"thread-1"}', {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
          "Set-Cookie": "upstream=value",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("https://app.example/api/threads?_path=threads&limit=1", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          origin: "https://app.example",
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
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("does not approve cross-origin preflight requests", async () => {
    const response = OPTIONS(
      new Request("https://app.example/api/threads", {
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
