import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as route from "../../../../templates/langchain/app/api/[..._path]/route";

const fetchMock = vi.fn<typeof fetch>();

function request(
  path: string,
  init: { method?: string; site?: string | null; body?: string } = {},
) {
  const headers = new Headers({ "content-type": "application/json" });
  const site = init.site === undefined ? "same-origin" : init.site;
  if (site !== null) headers.set("sec-fetch-site", site);
  return new Request(`https://app.example/api/${path}`, {
    method: init.method ?? "GET",
    headers,
    ...(init.body === undefined ? {} : { body: init.body }),
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("LANGGRAPH_API_URL", "https://langgraph.example");
  vi.stubEnv("LANGCHAIN_API_KEY", "server-key");
  fetchMock.mockResolvedValue(Response.json({ ok: true }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("langchain template proxy", () => {
  it("forwards same-origin calls the chat UI makes with the server key", async () => {
    const created = await route.POST(
      request("threads", { method: "POST", body: "{}" }),
    );
    expect(created.status).toBe(200);
    const state = await route.GET(request("threads/t-1/state"));
    expect(state.status).toBe(200);
    const run = await route.POST(
      request("threads/t-1/runs/stream", { method: "POST", body: "{}" }),
    );
    expect(run.status).toBe(200);
    const cancel = await route.POST(
      request("threads/t-1/runs/r-1/cancel", { method: "POST" }),
    );
    expect(cancel.status).toBe(200);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://langgraph.example/threads",
      "https://langgraph.example/threads/t-1/state",
      "https://langgraph.example/threads/t-1/runs/stream",
      "https://langgraph.example/threads/t-1/runs/r-1/cancel",
    ]);
    const headers = new Headers(fetchMock.mock.calls[0]![1]!.headers);
    expect(headers.get("x-api-key")).toBe("server-key");
  });

  it.each([
    ["missing", null],
    ["none", "none"],
  ])("forwards requests with %s fetch metadata", async (_label, site) => {
    const res = await route.GET(request("threads/t-1/state", { site }));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([
    ["cross-site", "cross-site"],
    ["same-site", "same-site"],
  ])("refuses requests with %s fetch metadata", async (_label, site) => {
    const res = await route.GET(request("threads/t-1/state", { site }));
    expect(res.status).toBe(403);
    const opts = await route.OPTIONS(request("threads", { site }));
    expect(opts.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a foreign Origin when fetch metadata is missing", async () => {
    const req = new Request("https://app.example/api/threads", {
      method: "POST",
      headers: { origin: "https://other.example" },
      body: "{}",
    });
    expect((await route.POST(req)).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["GET", "threads"],
    ["GET", "assistants"],
    ["GET", "threads/t-1"],
    ["POST", "threads/search"],
    ["POST", "store/items/search"],
    ["POST", "assistants/search"],
    ["POST", "threads/t-1/runs/%2Fadmin/cancel"],
  ])("does not forward %s %s", async (method, path) => {
    const handler = method === "GET" ? route.GET : route.POST;
    const res = await handler(request(path, { method }));
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not forward delete, put or patch", async () => {
    for (const handler of [route.DELETE, route.PUT, route.PATCH, route.HEAD]) {
      expect(handler().status).toBe(404);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a fixed message when the upstream call throws", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5"));
    const res = await route.GET(request("threads/t-1/state"));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Proxy request failed." });
    expect(error).toHaveBeenCalled();
  });
});
