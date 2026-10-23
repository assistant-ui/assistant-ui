import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonSchema, type ModelMessage, type ToolSet } from "ai";
import { RESUMABLE_STREAM_ID_HEADER } from "assistant-stream/resumable";

const mocks = vi.hoisted(() => ({
  convertToModelMessages:
    vi.fn<
      (
        messages: unknown,
        options?: { tools?: ToolSet },
      ) => Promise<ModelMessage[]>
    >(),
  streamText:
    vi.fn<
      (options: {
        abortSignal?: AbortSignal;
        messages: ModelMessage[];
        tools?: ToolSet;
      }) => { toUIMessageStreamResponse: () => Response }
    >(),
  getMcpTools: vi.fn<() => Promise<ToolSet>>(),
  getMcpClient:
    vi.fn<() => Promise<{ listResources: () => Promise<unknown> }>>(),
  resume:
    vi.fn<
      (
        id: string,
        createStream: () => ReadableStream<Uint8Array>,
      ) => Promise<ReadableStream<Uint8Array>>
    >(),
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  convertToModelMessages: mocks.convertToModelMessages,
  streamText: mocks.streamText,
}));

vi.mock("../../../../../templates/mcp/app/api/mcp-client", () => ({
  getMcpTools: mocks.getMcpTools,
  getMcpClient: mocks.getMcpClient,
}));

vi.mock("@/lib/resumable-context", () => ({
  resumableContext: { run: mocks.resume },
}));

const messages = [
  { id: "user-1", role: "user", parts: [{ type: "text", text: "Hello" }] },
];
const modelMessages: ModelMessage[] = [
  { role: "user", content: "Converted message" },
];
const tools = {
  lookup: {
    description: "Look up a value",
    parameters: { type: "object", properties: {} },
  },
};

beforeEach(() => {
  mocks.convertToModelMessages.mockResolvedValue(modelMessages);
  mocks.streamText.mockImplementation(() => ({
    toUIMessageStreamResponse: () => new Response("streamed answer"),
  }));
  mocks.getMcpTools.mockResolvedValue({});
  mocks.getMcpClient.mockResolvedValue({
    listResources: async () => ({ resources: [] }),
  });
  mocks.resume.mockImplementation(async (_id, createStream) => createStream());
});

const routes = [
  { name: "registry", path: "./route.ts", hasTools: true, resumable: false },
  ...["default", "minimal", "cloud", "cloud-clerk", "mcp"].map((name) => ({
    name,
    path: `../../../../../templates/${name}/app/api/chat/route.ts`,
    hasTools: true,
    resumable: false,
  })),
  {
    name: "cloud-harness",
    path: "../../../../../templates/cloud-harness/app/api/chat/route.ts",
    hasTools: false,
    resumable: false,
  },
  {
    name: "vscode",
    path: "../../../../../templates/vscode/src/api/chat/route.ts",
    hasTools: true,
    resumable: false,
  },
  {
    name: "resumable registry",
    path: "../../../templates/ai-sdk-backend-resumable/app/api/chat/route.ts",
    hasTools: true,
    resumable: true,
  },
];

const loadRoute = async (path: string) => {
  const route = await import(new URL(path, import.meta.url).href);
  const POST: (request: Request) => Promise<Response> = route.POST;
  return POST;
};

const mcpRoutes = [
  {
    name: "chat",
    path: "../../../../../templates/mcp/app/api/chat/route.ts",
    body: { messages, tools },
  },
  {
    name: "mcp-apps",
    path: "../../../../../templates/mcp/app/api/mcp-apps/route.ts",
    body: { method: "resources/list" },
  },
];

beforeAll(async () => {
  await Promise.all(
    [...routes, ...mcpRoutes].map(({ path }) => loadRoute(path)),
  );
});

const createRequest = (signal?: AbortSignal) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages, tools }),
    ...(signal ? { signal } : {}),
  });

describe.each(routes)("$name chat route", ({ path, hasTools, resumable }) => {
  it(
    resumable
      ? "keeps the resumable stream independent of request cancellation"
      : "forwards cancellation to the provider after the response starts",
    async () => {
      const POST = await loadRoute(path);
      const controller = new AbortController();
      const request = createRequest(controller.signal);
      const response = await POST(request);

      expect(mocks.streamText).toHaveBeenCalledTimes(1);
      const [options] = mocks.streamText.mock.calls[0]!;
      if (resumable) {
        expect(options.abortSignal).toBeUndefined();
        expect(mocks.resume).toHaveBeenCalledTimes(1);
        expect(response.headers.get(RESUMABLE_STREAM_ID_HEADER)).toBe(
          mocks.resume.mock.calls[0]![0],
        );
      } else {
        expect(options.abortSignal).toBe(request.signal);
        expect(options.abortSignal?.aborted).toBe(false);
      }

      controller.abort();
      expect(request.signal.aborted).toBe(true);
      if (!resumable) expect(options.abortSignal?.aborted).toBe(true);
      expect(await response.text()).toBe("streamed answer");
    },
  );

  it(
    hasTools
      ? "uses the same frontend tools for message conversion and streaming"
      : "converts messages without adding tools to the tool-free harness",
    async () => {
      const POST = await loadRoute(path);
      await POST(createRequest());

      expect(mocks.convertToModelMessages).toHaveBeenCalledTimes(1);
      const [input, conversion] = mocks.convertToModelMessages.mock.calls[0]!;
      const [stream] = mocks.streamText.mock.calls[0]!;
      expect(input).toEqual(messages);
      expect(stream.messages).toBe(modelMessages);

      if (hasTools) {
        expect(Object.keys(stream.tools!)).toEqual(["lookup"]);
        expect(conversion?.tools).toBe(stream.tools);
        expect(conversion?.tools?.lookup?.toModelOutput).toBeTypeOf("function");
      } else {
        expect(conversion?.tools).toBeUndefined();
        expect(stream.tools).toBeUndefined();
      }
    },
  );
});

it("preserves MCP tools and lets frontend tools override matching names in both calls", async () => {
  const serverTool = {
    description: "Server tool",
    inputSchema: jsonSchema({ type: "object", properties: {} }),
  };
  mocks.getMcpTools.mockResolvedValue({
    serverOnly: serverTool,
    lookup: serverTool,
  });
  const POST = await loadRoute(
    "../../../../../templates/mcp/app/api/chat/route.ts",
  );
  await POST(createRequest());

  const [, conversion] = mocks.convertToModelMessages.mock.calls[0]!;
  const [stream] = mocks.streamText.mock.calls[0]!;
  expect(conversion?.tools).toBe(stream.tools);
  expect(stream.tools?.serverOnly).toBe(serverTool);
  expect(stream.tools?.lookup).not.toBe(serverTool);
  expect(stream.tools?.lookup?.toModelOutput).toBeTypeOf("function");
});

describe.each(mcpRoutes)("mcp template $name route", ({ path, body }) => {
  const request = (headers: Record<string, string>) =>
    new Request("http://localhost/api/mcp", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

  it.each([
    ["a cross-site fetch", { "sec-fetch-site": "cross-site" }],
    ["a foreign Origin", { origin: "https://example.net" }],
  ])("rejects %s before reaching the MCP server", async (_label, headers) => {
    const POST = await loadRoute(path);
    const response = await POST(request(headers));

    expect(response.status).toBe(403);
    expect(mocks.getMcpTools).not.toHaveBeenCalled();
    expect(mocks.getMcpClient).not.toHaveBeenCalled();
  });

  it.each([
    ["a same-origin fetch", { "sec-fetch-site": "same-origin" }],
    ["its own Origin", { origin: "http://localhost" }],
  ])("serves %s", async (_label, headers) => {
    const POST = await loadRoute(path);
    const response = await POST(request(headers));

    expect(response.status).toBe(200);
  });
});
