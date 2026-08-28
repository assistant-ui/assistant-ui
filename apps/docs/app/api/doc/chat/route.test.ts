import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  checkRateLimit: vi.fn(),
  getModel: vi.fn(),
}));

vi.mock("@/lib/anonymous-session", async (importOriginal) => ({
  ...(await importOriginal()),
  requirePublicAssistantSession: mocks.requireSession,
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal()),
  checkPublicAssistantRateLimit: mocks.checkRateLimit,
}));

vi.mock("@/lib/ai/provider", async (importOriginal) => ({
  ...(await importOriginal()),
  getModel: mocks.getModel,
}));

// @/lib/source and @/lib/llm-components import the build-generated
// "fumadocs-mdx:collections/server" module, which does not resolve in the test
// environment, so these two mocks fully replace the modules instead of
// spreading importOriginal().
vi.mock("@/lib/llm-components", () => ({ LLM_COMPONENTS: {} }));

vi.mock("@/lib/source", () => {
  const emptySource = {
    pageTree: { children: [] },
    getPage: vi.fn(),
  };
  return {
    source: emptySource,
    examples: emptySource,
    tapDocs: emptySource,
    getTapDocsPage: vi.fn(),
  };
});

import type { UIMessageChunk } from "ai";
import { POST, withReadDocSources } from "./route";

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/doc/chat access boundary", () => {
  it("rejects a direct request before rate limiting or model selection", async () => {
    mocks.requireSession.mockReturnValue(
      Response.json({ error: "website required" }, { status: 403 }),
    );

    const response = await POST(
      new Request("https://www.assistant-ui.com/api/doc/chat", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.getModel).not.toHaveBeenCalled();
  });

  it("lets a valid session reach ordinary input validation", async () => {
    mocks.requireSession.mockReturnValue({
      id: "session_1234567890",
      expiresAt: Date.now() + 60_000,
    });
    mocks.checkRateLimit.mockResolvedValue(null);

    const response = await POST(
      new Request("https://www.assistant-ui.com/api/doc/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      "session_1234567890",
    );
    expect(mocks.getModel).not.toHaveBeenCalled();
  });
});

describe("withReadDocSources", () => {
  const run = async (chunks: UIMessageChunk[]) => {
    const out: UIMessageChunk[] = [];
    for await (const chunk of withReadDocSources(
      (async function* () {
        yield* chunks;
      })(),
    )) {
      out.push(chunk);
    }
    return out;
  };

  it("emits one source-url per distinct readDoc result", async () => {
    const out = await run([
      {
        type: "tool-input-available",
        toolCallId: "a",
        toolName: "readDoc",
        input: {},
      },
      {
        type: "tool-output-available",
        toolCallId: "a",
        output: { title: "Thread", url: "/docs/ui/thread" },
      },
      {
        type: "tool-input-available",
        toolCallId: "b",
        toolName: "readDoc",
        input: {},
      },
      {
        type: "tool-output-available",
        toolCallId: "b",
        output: { title: "Thread", url: "/docs/ui/thread" },
      },
    ] as UIMessageChunk[]);

    expect(out.filter((chunk) => chunk.type === "source-url")).toEqual([
      {
        type: "source-url",
        sourceId: "a",
        url: "/docs/ui/thread",
        title: "Thread",
      },
    ]);
    expect(out).toHaveLength(5);
  });

  it("ignores error results and non-readDoc tools", async () => {
    const out = await run([
      {
        type: "tool-input-available",
        toolCallId: "a",
        toolName: "readDoc",
        input: {},
      },
      {
        type: "tool-output-available",
        toolCallId: "a",
        output: { error: "Page not found: nope" },
      },
      {
        type: "tool-input-available",
        toolCallId: "b",
        toolName: "bash",
        input: {},
      },
      {
        type: "tool-output-available",
        toolCallId: "b",
        output: { url: "/repo" },
      },
      {
        type: "message-metadata",
        messageMetadata: { custom: { usage: { totalTokens: 42 } } },
      },
    ] as UIMessageChunk[]);

    expect(out.filter((chunk) => chunk.type === "source-url")).toEqual([]);
    expect(out).toHaveLength(5);
    expect(out).toContainEqual({
      type: "message-metadata",
      messageMetadata: { custom: { usage: { totalTokens: 42 } } },
    });
  });
});
