import { describe, expect, it, vi } from "vitest";
import { readPageTool, searchDocsTool } from "@/lib/mcp-tool-definitions";
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
      expect(tool.annotations).toEqual({ readOnlyHint: true });
    }
    expect(tools[0]?.inputSchema).toBe(searchDocsTool.inputSchema);
    expect(tools[1]?.inputSchema).not.toBe(readPageTool.inputSchema);
    expect(tools[1]?.inputSchema).toMatchObject({
      properties: { path: { description: expect.stringContaining("Docs") } },
    });
    expect(tools[2]?.inputSchema).not.toBe(readPageTool.inputSchema);
    expect(tools[2]?.inputSchema).toMatchObject({
      properties: {
        path: { description: expect.stringContaining("Example slug") },
      },
    });
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

  it("getExample maps full URLs to their pathname before prefixing", async () => {
    const fetchImpl = fetchReturning({ result: okResult });
    await toolByName(fetchImpl, "getExample").execute({
      path: "https://assistant-ui.com/examples/ai-sdk",
    });

    expect(sentRequest(fetchImpl).body.params).toEqual({
      name: "read_page",
      arguments: { path: "examples/ai-sdk" },
    });
  });

  it("getExample passes cross-origin URLs through for the route to reject", async () => {
    vi.stubGlobal("window", {
      location: { origin: "https://assistant-ui.com" },
    });
    try {
      const fetchImpl = fetchReturning({ result: okResult });
      await toolByName(fetchImpl, "getExample").execute({
        path: "https://evil.example/examples/ai-sdk",
      });

      expect(sentRequest(fetchImpl).body.params).toEqual({
        name: "read_page",
        arguments: { path: "https://evil.example/examples/ai-sdk" },
      });
    } finally {
      vi.unstubAllGlobals();
    }
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

  it("rejects on missing arguments without fetching", async () => {
    const fetchImpl = fetchReturning({ result: okResult });
    await expect(
      toolByName(fetchImpl, "searchDocs").execute({}),
    ).rejects.toThrow("query is required");
    await expect(
      toolByName(fetchImpl, "getDoc").execute({ path: "  " }),
    ).rejects.toThrow("path is required");
    await expect(
      toolByName(fetchImpl, "getExample").execute({}),
    ).rejects.toThrow("path is required");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects on fetch failures, HTTP errors, and JSON-RPC errors", async () => {
    const rejecting = vi.fn(async () => {
      throw new Error("offline");
    });
    await expect(
      toolByName(rejecting as never, "searchDocs").execute({ query: "x" }),
    ).rejects.toThrow("offline");

    await expect(
      toolByName(fetchReturning({}, false, 500), "searchDocs").execute({
        query: "x",
      }),
    ).rejects.toThrow("500");

    await expect(
      toolByName(
        fetchReturning({ error: { message: "nope" } }),
        "searchDocs",
      ).execute({ query: "x" }),
    ).rejects.toThrow("nope");

    await expect(
      toolByName(fetchReturning({}), "searchDocs").execute({ query: "x" }),
    ).rejects.toThrow("unexpected response");
  });

  it("propagates AbortError rejections without wrapping them", async () => {
    const aborting = vi.fn(async () => {
      throw new DOMException("The user aborted a request.", "AbortError");
    });
    const rejection = await toolByName(aborting as never, "searchDocs")
      .execute({ query: "x" })
      .then(
        () => {
          throw new Error("expected rejection");
        },
        (error: unknown) => error,
      );
    expect(rejection).toBeInstanceOf(DOMException);
    expect((rejection as DOMException).name).toBe("AbortError");
  });

  it("propagates non-Error AbortError rejections without wrapping them", async () => {
    const abortValue = { name: "AbortError" };
    const aborting = vi.fn(async () => {
      throw abortValue;
    });
    const rejection = await toolByName(aborting as never, "searchDocs")
      .execute({ query: "x" })
      .then(
        () => {
          throw new Error("expected rejection");
        },
        (error: unknown) => error,
      );
    expect(rejection).toBe(abortValue);
  });

  it("propagates an AbortError raised while the body is streaming", async () => {
    const abortingBody = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new DOMException("The user aborted a request.", "AbortError");
      },
    }));
    const rejection = await toolByName(abortingBody, "getDoc")
      .execute({ path: "/docs/getting-started" })
      .then(
        () => {
          throw new Error("expected rejection");
        },
        (error: unknown) => error,
      );
    expect(rejection).toBeInstanceOf(DOMException);
    expect((rejection as DOMException).name).toBe("AbortError");
  });

  it("rejects on route-level isError results, surfacing the error text", async () => {
    const fetchImpl = fetchReturning({
      result: {
        content: [{ type: "text", text: "Page not found: nope" }],
        isError: true,
      },
    });
    await expect(
      toolByName(fetchImpl, "getDoc").execute({ path: "/docs/nope" }),
    ).rejects.toThrow("Page not found: nope");
  });

  it("rejects on malformed 200 responses", async () => {
    const invalidJson = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    }));
    await expect(
      toolByName(invalidJson, "searchDocs").execute({ query: "x" }),
    ).rejects.toThrow("invalid JSON");

    for (const payload of [null, "ok", { result: { content: "text" } }]) {
      await expect(
        toolByName(fetchReturning(payload), "searchDocs").execute({
          query: "x",
        }),
        JSON.stringify(payload),
      ).rejects.toThrow("unexpected response");
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

  it("swallows registration rejections with a dev warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const modelContext: WebMcpModelContext = {
        registerTool: vi.fn(() => Promise.reject(new Error("duplicate"))),
      };
      registerWebMcpTools(modelContext, fetchReturning({ result: okResult }));
      await vi.waitFor(() => {
        expect(modelContext.registerTool).toHaveBeenCalledTimes(3);
        expect(warn).toHaveBeenCalledTimes(3);
      });
    } finally {
      warn.mockRestore();
    }
  });
});
