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

function errorResult(text: string) {
  return { isError: true, content: [{ type: "text", text }] };
}

function fetchReturning(payload: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({
    ok,
    status,
    json: async () => payload,
    text: async () => String(payload),
  }));
}

const skillsIndex = {
  skills: [
    {
      name: "assistant-ui-docs",
      description: "Site skill.",
      url: "https://www.assistant-ui.com/.well-known/agent-skills/assistant-ui-docs/SKILL.md",
    },
    {
      name: "assistant-ui-design",
      description: "Design law.",
      url: "https://www.assistant-ui.com/design.md",
    },
    {
      name: "setup",
      description: "Installs assistant-ui.",
      url: "https://www.assistant-ui.com/.well-known/agent-skills/setup/SKILL.md",
    },
    {
      name: "tools",
      description: "Defines tools.",
      url: "https://www.assistant-ui.com/.well-known/agent-skills/tools/SKILL.md",
    },
  ],
};

const toolsSkillDocument = `---
name: tools
description: "Defines tools."
---

# Tools
`;

// Serves the skills index and the tools skill the way the discovery routes do.
function fetchSkillRoutes() {
  return vi.fn(async (url: string) => {
    if (url === "/.well-known/agent-skills/index.json") {
      return {
        ok: true,
        status: 200,
        json: async () => skillsIndex,
        text: async () => "",
      };
    }
    if (url === "/.well-known/agent-skills/tools/SKILL.md") {
      return {
        ok: true,
        status: 200,
        json: async () => null,
        text: async () => toolsSkillDocument,
      };
    }
    return {
      ok: false,
      status: 404,
      json: async () => null,
      text: async () => "",
    };
  });
}

type Tracker = Parameters<typeof registerWebMcpTools>[2];

function spyTracker() {
  return {
    hostDetected: vi.fn(),
    toolRegistered: vi.fn(),
    toolCalled: vi.fn(),
  };
}

function registeredTools(
  fetchImpl: FetchLike,
  tracker: Tracker = spyTracker(),
) {
  const tools: Parameters<WebMcpModelContext["registerTool"]>[0][] = [];
  registerWebMcpTools(
    {
      registerTool: (tool) => {
        tools.push(tool);
        return Promise.resolve();
      },
    },
    fetchImpl,
    tracker,
  );
  return tools;
}

function toolByName(fetchImpl: FetchLike, name: string, tracker?: Tracker) {
  const tool = registeredTools(fetchImpl, tracker).find((t) => t.name === name);
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
  it("registers the five read-only tools with object inputs", () => {
    const tools = registeredTools(fetchReturning({ result: okResult }));
    expect(tools.map((t) => t.name)).toEqual([
      "searchDocs",
      "getDoc",
      "getExample",
      "listSkills",
      "getSkill",
    ]);
    for (const tool of tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema["type"]).toBe("object");
      expect(tool.inputSchema["additionalProperties"]).toBe(false);
      expect(tool.annotations).toEqual({ readOnlyHint: true });
    }
    expect(tools.slice(0, 3).map((t) => t.inputSchema["required"])).toEqual([
      ["query"],
      ["path"],
      ["path"],
    ]);
    expect(tools[3]?.inputSchema).toEqual({
      type: "object",
      properties: {},
      additionalProperties: false,
    });
    expect(tools[4]?.inputSchema["required"]).toEqual(["name"]);
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
      path: "/docs/installation",
    });

    expect(sentRequest(fetchImpl).body.params).toEqual({
      name: "read_page",
      arguments: { path: "/docs/installation" },
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

  it("listSkills lists the repo skills from the served index", async () => {
    const fetchImpl = fetchSkillRoutes();
    const controller = new AbortController();
    const result = await toolByName(fetchImpl, "listSkills").execute(
      {},
      { signal: controller.signal },
    );

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify([
            { name: "setup", description: "Installs assistant-ui." },
            { name: "tools", description: "Defines tools." },
          ]),
        },
      ],
    });
    expect(fetchImpl).toHaveBeenCalledExactlyOnceWith(
      "/.well-known/agent-skills/index.json",
      {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      },
    );
  });

  it("getSkill reads the served SKILL.md and parses its frontmatter", async () => {
    const fetchImpl = fetchSkillRoutes();
    const controller = new AbortController();
    const result = await toolByName(fetchImpl, "getSkill").execute(
      { name: " tools " },
      { signal: controller.signal },
    );

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            name: "tools",
            description: "Defines tools.",
            content: "# Tools\n",
          }),
        },
      ],
    });
    expect(fetchImpl).toHaveBeenCalledExactlyOnceWith(
      "/.well-known/agent-skills/tools/SKILL.md",
      {
        method: "GET",
        headers: { Accept: "text/markdown" },
        signal: controller.signal,
      },
    );
  });

  it("getSkill returns an isError result naming the valid skills on a 404", async () => {
    const fetchImpl = fetchSkillRoutes();
    await expect(
      toolByName(fetchImpl, "getSkill").execute({ name: "nope" }),
    ).resolves.toEqual(
      errorResult("Unknown skill: nope. Valid names: setup, tools"),
    );
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      "/.well-known/agent-skills/nope/SKILL.md",
      "/.well-known/agent-skills/index.json",
    ]);

    await expect(
      toolByName(fetchImpl, "getSkill").execute({ name: "../nope" }),
    ).resolves.toEqual(
      errorResult("Unknown skill: ../nope. Valid names: setup, tools"),
    );
    expect(fetchImpl.mock.calls[2]?.[0]).toBe(
      "/.well-known/agent-skills/..%2Fnope/SKILL.md",
    );

    await expect(
      toolByName(fetchImpl, "getSkill").execute({}),
    ).resolves.toEqual(errorResult("name is required"));
  });

  it("returns isError results on malformed skill routes", async () => {
    await expect(
      toolByName(fetchReturning({ skills: "nope" }), "listSkills").execute({}),
    ).resolves.toEqual(
      errorResult("Docs request returned an unexpected response"),
    );
    await expect(
      toolByName(fetchReturning({}, false, 500), "listSkills").execute({}),
    ).resolves.toEqual(errorResult("Docs request failed with status 500"));
    for (const document of [
      "# no frontmatter",
      "---\nname: tools\ndescription: unquoted\n---\n\n# Tools\n",
    ]) {
      await expect(
        toolByName(fetchReturning(document), "getSkill").execute({
          name: "tools",
        }),
        JSON.stringify(document),
      ).resolves.toEqual(
        errorResult("Docs request returned an unexpected response"),
      );
    }
  });

  it("rejects an aborted listSkills or getSkill call with the abort reason", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl: FetchLike = async (_url, init) => {
      init.signal?.throwIfAborted();
      throw new Error("expected an aborted signal");
    };
    await expect(
      toolByName(fetchImpl, "listSkills").execute(
        {},
        { signal: controller.signal },
      ),
    ).rejects.toBe(controller.signal.reason);
    await expect(
      toolByName(fetchImpl, "getSkill").execute(
        { name: "tools" },
        { signal: controller.signal },
      ),
    ).rejects.toBe(controller.signal.reason);
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

  it("returns isError results on missing arguments without fetching", async () => {
    const fetchImpl = fetchReturning({ result: okResult });
    await expect(
      toolByName(fetchImpl, "searchDocs").execute({}),
    ).resolves.toEqual(errorResult("query is required"));
    await expect(
      toolByName(fetchImpl, "getDoc").execute({ path: "  " }),
    ).resolves.toEqual(errorResult("path is required"));
    await expect(
      toolByName(fetchImpl, "getExample").execute({}),
    ).resolves.toEqual(errorResult("path is required"));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns isError results on fetch failures, HTTP errors, and JSON-RPC errors", async () => {
    const rejecting = vi.fn(async () => {
      throw new Error("offline");
    });
    await expect(
      toolByName(rejecting as never, "searchDocs").execute({ query: "x" }),
    ).resolves.toEqual(errorResult("Docs request failed: offline"));

    await expect(
      toolByName(fetchReturning({}, false, 500), "searchDocs").execute({
        query: "x",
      }),
    ).resolves.toEqual(errorResult("Docs request failed with status 500"));

    await expect(
      toolByName(
        fetchReturning({ error: { message: "nope" } }),
        "searchDocs",
      ).execute({ query: "x" }),
    ).resolves.toEqual(errorResult("nope"));

    await expect(
      toolByName(fetchReturning({}), "searchDocs").execute({ query: "x" }),
    ).resolves.toEqual(
      errorResult("Docs request returned an unexpected response"),
    );
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
      .execute({ path: "/docs/installation" })
      .then(
        () => {
          throw new Error("expected rejection");
        },
        (error: unknown) => error,
      );
    expect(rejection).toBeInstanceOf(DOMException);
    expect((rejection as DOMException).name).toBe("AbortError");
  });

  it("passes route-level isError results through with their error text", async () => {
    const fetchImpl = fetchReturning({
      result: {
        content: [{ type: "text", text: "Page not found: nope" }],
        isError: true,
      },
    });
    await expect(
      toolByName(fetchImpl, "getDoc").execute({ path: "/docs/nope" }),
    ).resolves.toEqual(errorResult("Page not found: nope"));
  });

  it("returns isError results on malformed 200 responses", async () => {
    const invalidJson = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    }));
    await expect(
      toolByName(invalidJson, "searchDocs").execute({ query: "x" }),
    ).resolves.toEqual(errorResult("Docs request returned invalid JSON"));

    for (const payload of [null, "ok", { result: { content: "text" } }]) {
      await expect(
        toolByName(fetchReturning(payload), "searchDocs").execute({
          query: "x",
        }),
        JSON.stringify(payload),
      ).resolves.toEqual(
        errorResult("Docs request returned an unexpected response"),
      );
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
      spyTracker(),
    );
    expect(modelContext.registerTool).toHaveBeenCalledTimes(5);
    expect(signals).toHaveLength(5);
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
      registerWebMcpTools(
        modelContext,
        fetchReturning({ result: okResult }),
        spyTracker(),
      );
      await vi.waitFor(() => {
        expect(modelContext.registerTool).toHaveBeenCalledTimes(5);
        expect(warn).toHaveBeenCalledTimes(5);
      });
    } finally {
      warn.mockRestore();
    }
  });
});

describe("WebMCP call counter", () => {
  it("reports host detection exactly once per registration", () => {
    const tracker = spyTracker();
    const fetchImpl = fetchReturning({ result: okResult });
    registeredTools(fetchImpl, tracker);
    expect(tracker.hostDetected.mock.calls).toEqual([[]]);
    registeredTools(fetchImpl, tracker);
    expect(tracker.hostDetected.mock.calls).toEqual([[], []]);
    expect(tracker.toolCalled).not.toHaveBeenCalled();
  });

  it("reports each tool's registration outcome without the error message", async () => {
    const tracker = spyTracker();
    const modelContext: WebMcpModelContext = {
      registerTool: vi.fn((tool) =>
        tool.name === "getDoc"
          ? Promise.reject(
              new DOMException("blocked by /docs policy", "NotAllowedError"),
            )
          : Promise.resolve(),
      ),
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      registerWebMcpTools(
        modelContext,
        fetchReturning({ result: okResult }),
        tracker,
      );
      await vi.waitFor(() =>
        expect(tracker.toolRegistered).toHaveBeenCalledTimes(5),
      );
      expect(tracker.toolRegistered.mock.calls.map(([props]) => props)).toEqual(
        [
          { tool: "searchDocs", status: "ok" },
          { tool: "getDoc", status: "failed", error_name: "NotAllowedError" },
          { tool: "getExample", status: "ok" },
          { tool: "listSkills", status: "ok" },
          { tool: "getSkill", status: "ok" },
        ],
      );
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  it("reports successful searches with rounded latency", async () => {
    const tracker = spyTracker();
    const now = vi
      .spyOn(performance, "now")
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(12.6);
    try {
      await expect(
        toolByName(
          fetchReturning({ result: okResult }),
          "searchDocs",
          tracker,
        ).execute({ query: "tools" }),
      ).resolves.toEqual(okResult);
      expect(tracker.toolCalled).toHaveBeenCalledExactlyOnceWith({
        tool: "searchDocs",
        status: "ok",
        latency_ms: 3,
      });
    } finally {
      now.mockRestore();
    }
  });

  it("reports route isError results and passes them through", async () => {
    const tracker = spyTracker();
    const routeResult = errorResult("Page not found: nope");
    await expect(
      toolByName(
        fetchReturning({ result: routeResult }),
        "getDoc",
        tracker,
      ).execute({ path: "/docs/nope" }),
    ).resolves.toEqual(routeResult);
    expect(tracker.toolCalled).toHaveBeenCalledExactlyOnceWith({
      tool: "getDoc",
      status: "error",
      latency_ms: expect.any(Number),
    });
  });

  it("reports thrown non-abort errors after conversion to error results", async () => {
    const tracker = spyTracker();
    await expect(
      toolByName(fetchReturning({}, false, 500), "searchDocs", tracker).execute(
        { query: "tools" },
      ),
    ).resolves.toEqual(errorResult("Docs request failed with status 500"));
    expect(tracker.toolCalled).toHaveBeenCalledExactlyOnceWith({
      tool: "searchDocs",
      status: "error",
      latency_ms: expect.any(Number),
    });
  });

  it("reports aborts and preserves the rejection reference", async () => {
    const tracker = spyTracker();
    const controller = new AbortController();
    controller.abort();
    const fetchImpl: FetchLike = async (_url, init) => {
      init.signal?.throwIfAborted();
      throw new Error("expected an aborted signal");
    };
    await expect(
      toolByName(fetchImpl, "searchDocs", tracker).execute(
        { query: "tools" },
        { signal: controller.signal },
      ),
    ).rejects.toBe(controller.signal.reason);
    expect(controller.signal.reason.name).toBe("AbortError");
    expect(tracker.toolCalled).toHaveBeenCalledExactlyOnceWith({
      tool: "searchDocs",
      status: "aborted",
      latency_ms: expect.any(Number),
    });
  });

  it.each(["throwing", "rejecting", "pending"])(
    "isolates a %s tracker from the tool result",
    async (failure) => {
      const track = vi.fn(() => {
        const error = new Error("tracking failed");
        if (failure === "throwing") throw error;
        if (failure === "rejecting") return Promise.reject(error);
        return new Promise<void>(() => {});
      });
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        await expect(
          toolByName(fetchReturning({ result: okResult }), "searchDocs", {
            hostDetected: track,
            toolRegistered: track,
            toolCalled: track,
          }).execute({ query: "tools" }),
        ).resolves.toEqual(okResult);
        await vi.waitFor(() =>
          expect(warn).toHaveBeenCalledTimes(failure === "pending" ? 0 : 7),
        );
      } finally {
        warn.mockRestore();
      }
    },
  );

  it("sends only tool, status, and latency for all five tools", async () => {
    const tracker = spyTracker();
    const skillRoutes = fetchSkillRoutes();
    const tools = registeredTools(
      vi.fn(async (url: string, init) =>
        init.method === "GET"
          ? skillRoutes(url)
          : {
              ok: true,
              status: 200,
              json: async () => ({ result: okResult }),
              text: async () => "",
            },
      ),
      tracker,
    );
    for (const tool of tools) {
      await tool.execute({
        query: "private query",
        path: "private/path",
        name: "tools",
      });
    }
    expect(tracker.toolCalled.mock.calls.map(([props]) => props.tool)).toEqual([
      "searchDocs",
      "getDoc",
      "getExample",
      "listSkills",
      "getSkill",
    ]);
    for (const [props] of tracker.toolCalled.mock.calls) {
      expect(Object.keys(props).sort()).toEqual([
        "latency_ms",
        "status",
        "tool",
      ]);
      expect(props.status).toBe("ok");
      expect(Number.isInteger(props.latency_ms)).toBe(true);
      expect(props.latency_ms).toBeGreaterThanOrEqual(0);
    }
  });
});
