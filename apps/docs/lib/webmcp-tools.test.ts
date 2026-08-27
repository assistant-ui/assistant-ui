import { describe, expect, it, vi } from "vitest";
import {
  getWebMcpModelContext,
  registerWebMcpTools,
  type FetchLike,
  type WebMcpModelContext,
} from "./webmcp-tools";

const okResult = {
  content: [{ type: "text", text: "hello" }],
};

function fetchReturning(payload: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({
    ok,
    status,
    json: async () => payload,
  }));
}

function registeredTools(fetchImpl: FetchLike) {
  const tools: Parameters<WebMcpModelContext["registerTool"]>[0][] = [];
  registerWebMcpTools(
    {
      registerTool: (tool) => {
        tools.push(tool);
        return Promise.resolve();
      },
    },
    fetchImpl,
  );
  return tools;
}

function toolByName(fetchImpl: FetchLike, name: string) {
  const tool = registeredTools(fetchImpl).find((t) => t.name === name);
  if (!tool) throw new Error(`missing tool ${name}`);
  return tool;
}

function sentRequest(fetchImpl: ReturnType<typeof fetchReturning>) {
  const [url, init] = (fetchImpl.mock.calls[0] ?? []) as unknown as [
    string,
    { headers: Record<string, string>; body: string },
  ];
  return { url, headers: init.headers, body: JSON.parse(init.body) };
}

describe("getWebMcpModelContext", () => {
  it("returns undefined outside the browser", () => {
    expect(getWebMcpModelContext()).toBeUndefined();
  });

  it("prefers document.modelContext and falls back to navigator", () => {
    const documentContext = { registerTool: vi.fn() };
    const navigatorContext = { registerTool: vi.fn() };
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", { modelContext: documentContext });
    vi.stubGlobal("navigator", { modelContext: navigatorContext });
    try {
      expect(getWebMcpModelContext()).toBe(documentContext);

      vi.stubGlobal("document", {});
      expect(getWebMcpModelContext()).toBe(navigatorContext);

      vi.stubGlobal("navigator", {});
      expect(getWebMcpModelContext()).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("registered tools", () => {
  it("registers the three tools with required string inputs", () => {
    const tools = registeredTools(fetchReturning({ result: okResult }));
    expect(tools.map((t) => t.name)).toEqual([
      "searchDocs",
      "getDoc",
      "getExample",
    ]);
    for (const tool of tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema["type"]).toBe("object");
      expect(tool.inputSchema["required"]).toHaveLength(1);
    }
  });

  it("searchDocs calls search_docs on /api/mcp and passes the result through", async () => {
    const fetchImpl = fetchReturning({ result: okResult });
    const result = await toolByName(fetchImpl, "searchDocs").execute({
      query: "tools",
    });

    expect(result).toEqual(okResult);
    const { url, headers, body } = sentRequest(fetchImpl);
    expect(url).toBe("/api/mcp");
    expect(headers["Accept"]).toBe("application/json, text/event-stream");
    expect(body.method).toBe("tools/call");
    expect(body.params).toEqual({
      name: "search_docs",
      arguments: { query: "tools" },
    });
  });

  it("getDoc calls read_page with the given path", async () => {
    const fetchImpl = fetchReturning({ result: okResult });
    await toolByName(fetchImpl, "getDoc").execute({
      path: "/docs/getting-started",
    });

    expect(sentRequest(fetchImpl).body.params).toEqual({
      name: "read_page",
      arguments: { path: "/docs/getting-started" },
    });
  });

  it("getExample prefixes bare slugs with examples/", async () => {
    const fetchImpl = fetchReturning({ result: okResult });
    await toolByName(fetchImpl, "getExample").execute({ path: "ai-sdk" });

    expect(sentRequest(fetchImpl).body.params).toEqual({
      name: "read_page",
      arguments: { path: "examples/ai-sdk" },
    });
  });

  it("getExample leaves examples paths untouched", async () => {
    const fetchImpl = fetchReturning({ result: okResult });
    await toolByName(fetchImpl, "getExample").execute({
      path: "/examples/ai-sdk",
    });

    expect(sentRequest(fetchImpl).body.params).toEqual({
      name: "read_page",
      arguments: { path: "examples/ai-sdk" },
    });
  });

  it("forwards the execute AbortSignal to fetch", async () => {
    const fetchImpl = fetchReturning({ result: okResult });
    const controller = new AbortController();
    await toolByName(fetchImpl, "searchDocs").execute(
      { query: "x" },
      { signal: controller.signal },
    );

    const [, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      { signal?: AbortSignal },
    ];
    expect(init.signal).toBe(controller.signal);
  });

  it("returns an error result for missing arguments without fetching", async () => {
    const fetchImpl = fetchReturning({ result: okResult });
    for (const [name, result] of [
      ["searchDocs", await toolByName(fetchImpl, "searchDocs").execute({})],
      ["getDoc", await toolByName(fetchImpl, "getDoc").execute({ path: "  " })],
      ["getExample", await toolByName(fetchImpl, "getExample").execute({})],
    ] as const) {
      expect(result.isError, name).toBe(true);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps fetch failures, HTTP errors, and JSON-RPC errors to error results", async () => {
    const rejecting = vi.fn(async () => {
      throw new Error("offline");
    });
    const offline = await toolByName(rejecting as never, "searchDocs").execute({
      query: "x",
    });
    expect(offline.isError).toBe(true);
    expect(offline.content[0]?.text).toContain("offline");

    const httpError = await toolByName(
      fetchReturning({}, false, 500),
      "searchDocs",
    ).execute({ query: "x" });
    expect(httpError.isError).toBe(true);
    expect(httpError.content[0]?.text).toContain("500");

    const rpcError = await toolByName(
      fetchReturning({ error: { message: "nope" } }),
      "searchDocs",
    ).execute({ query: "x" });
    expect(rpcError).toEqual({
      content: [{ type: "text", text: "nope" }],
      isError: true,
    });

    const malformed = await toolByName(
      fetchReturning({}),
      "searchDocs",
    ).execute({ query: "x" });
    expect(malformed.isError).toBe(true);
  });

  it("maps malformed 200 responses to error results instead of throwing", async () => {
    const invalidJson = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    }));
    const invalid = await toolByName(invalidJson, "searchDocs").execute({
      query: "x",
    });
    expect(invalid.isError).toBe(true);
    expect(invalid.content[0]?.text).toContain("invalid JSON");

    for (const payload of [null, "ok", { result: { content: "text" } }]) {
      const result = await toolByName(
        fetchReturning(payload),
        "searchDocs",
      ).execute({ query: "x" });
      expect(result.isError, JSON.stringify(payload)).toBe(true);
    }
  });
});

describe("registerWebMcpTools lifecycle", () => {
  it("registers with a shared AbortSignal and aborts it on cleanup", () => {
    const signals: (AbortSignal | undefined)[] = [];
    const modelContext: WebMcpModelContext = {
      registerTool: vi.fn((_tool, options) => {
        signals.push(options?.signal);
        return Promise.resolve();
      }),
    };

    const cleanup = registerWebMcpTools(
      modelContext,
      fetchReturning({ result: okResult }),
    );
    expect(modelContext.registerTool).toHaveBeenCalledTimes(3);
    expect(signals).toHaveLength(3);
    expect(signals.every((signal) => signal && !signal.aborted)).toBe(true);

    cleanup();
    expect(signals.every((signal) => signal?.aborted)).toBe(true);
  });

  it("swallows registration rejections", async () => {
    const modelContext: WebMcpModelContext = {
      registerTool: vi.fn(() => Promise.reject(new Error("duplicate"))),
    };
    registerWebMcpTools(modelContext, fetchReturning({ result: okResult }));
    await vi.waitFor(() => {
      expect(modelContext.registerTool).toHaveBeenCalledTimes(3);
    });
  });
});
