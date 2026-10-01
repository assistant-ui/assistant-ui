import type {
  ChatModelRunOptions,
  ChatModelRunResult,
  ThreadMessage,
} from "@assistant-ui/core";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { createAssistantStreamResponse, type Tool } from "assistant-stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WebviewRoutes } from "../host/router";
import { serveWebviewRoutes } from "../host/serve";
import type { VSCodeModelRequest } from "../model-request";
import { createInMemoryBridge } from "../testUtils";
import { createVSCodeFetch } from "./fetch";
import { createVSCodeModelAdapter } from "./model-adapter";

const createdAt = new Date("2026-01-01T00:00:00.000Z");

const userMessage: ThreadMessage = {
  id: "user",
  role: "user",
  content: [{ type: "text", text: "Hello" }],
  attachments: [],
  createdAt,
  metadata: { custom: {} },
};

const assistantMessage: ThreadMessage = {
  id: "assistant",
  role: "assistant",
  content: [],
  status: { type: "running" },
  createdAt,
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
};

const weatherTool: Tool = {
  description: "Get the weather",
  parameters: {
    type: "object",
    properties: { city: { type: "string" } },
    required: ["city"],
  },
  execute: async () => "sunny",
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const disposers: (() => void)[] = [];
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
});

const setup = (routes: WebviewRoutes) => {
  const bridge = createInMemoryBridge();
  const server = serveWebviewRoutes(bridge.webview, routes, {
    flushInterval: 0,
    onError: () => undefined,
  });
  disposers.push(() => server.dispose());
  return createVSCodeModelAdapter({ fetch: createVSCodeFetch(bridge.port) });
};

const runOptions = (
  abortSignal: AbortSignal,
  tools: Record<string, Tool> = {},
): ChatModelRunOptions => ({
  messages: [userMessage],
  runConfig: { custom: { mode: "test" } },
  abortSignal,
  context: { system: "Be brief", tools },
  unstable_threadId: "thread-1",
  unstable_getMessage: () => assistantMessage,
});

const run = (
  adapter: ReturnType<typeof createVSCodeModelAdapter>,
  options: ChatModelRunOptions,
) => adapter.run(options) as AsyncGenerator<ChatModelRunResult, void>;

const collect = async (generator: AsyncGenerator<ChatModelRunResult>) => {
  const results: ChatModelRunResult[] = [];
  for await (const result of generator) results.push(result);
  return results;
};

const textOf = (result: ChatModelRunResult) =>
  (result.content ?? [])
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");

describe("createVSCodeModelAdapter", () => {
  it("posts the thread and tool schemas and yields cumulative snapshots", async () => {
    let received: VSCodeModelRequest | undefined;
    const adapter = setup({
      "/api/model": {
        POST: async (req) => {
          received = (await req.json()) as VSCodeModelRequest;
          return createAssistantStreamResponse(async (controller) => {
            controller.appendText("Hello");
            await delay(5);
            controller.appendText(", ");
            await delay(5);
            controller.appendText("world");
          });
        },
      },
    });

    const results = await collect(
      run(
        adapter,
        runOptions(new AbortController().signal, { get_weather: weatherTool }),
      ),
    );

    const texts = results.map(textOf).filter(Boolean);
    expect(texts.length).toBeGreaterThan(1);
    for (let i = 1; i < texts.length; i++) {
      expect(texts[i]!.startsWith(texts[i - 1]!)).toBe(true);
    }
    expect(texts.at(-1)).toBe("Hello, world");
    expect(received).toMatchObject({
      system: "Be brief",
      messages: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
      tools: {
        get_weather: {
          description: "Get the weather",
          parameters: {
            type: "object",
            properties: { city: { type: "string" } },
          },
        },
      },
      runConfig: { custom: { mode: "test" } },
      threadId: "thread-1",
    });
  });

  it("runs frontend tools called by the route", async () => {
    const adapter = setup({
      "/api/model": {
        POST: () =>
          createAssistantStreamResponse((controller) => {
            controller
              .addToolCallPart({
                toolCallId: "call-1",
                toolName: "get_weather",
                args: { city: "Paris" },
              })
              .close();
          }),
      },
    });

    const results = await collect(
      run(
        adapter,
        runOptions(new AbortController().signal, { get_weather: weatherTool }),
      ),
    );

    expect(results.at(-1)?.content).toContainEqual(
      expect.objectContaining({
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "get_weather",
        argsText: '{"city":"Paris"}',
        result: "sunny",
      }),
    );
  });

  it("decodes an AI SDK UI message stream response", async () => {
    const adapter = setup({
      "/api/model": {
        POST: () =>
          createUIMessageStreamResponse({
            stream: createUIMessageStream({
              execute: async ({ writer }) => {
                writer.write({ type: "text-start", id: "t" });
                writer.write({ type: "text-delta", id: "t", delta: "Hi " });
                await delay(5);
                writer.write({ type: "text-delta", id: "t", delta: "there" });
                writer.write({ type: "text-end", id: "t" });
              },
            }),
          }),
      },
    });

    const results = await collect(
      run(adapter, runOptions(new AbortController().signal)),
    );

    expect(textOf(results.at(-1)!)).toBe("Hi there");
  });

  it("stops the route and rejects with an AbortError when aborted", async () => {
    let handlerSignal: AbortSignal | undefined;
    const adapter = setup({
      "/api/model": {
        POST: (req) => {
          handlerSignal = req.signal;
          return createAssistantStreamResponse(async (controller) => {
            controller.appendText("partial");
            await new Promise((resolve) =>
              req.signal.addEventListener("abort", resolve),
            );
          });
        },
      },
    });
    const controller = new AbortController();

    const generator = run(adapter, runOptions(controller.signal));
    let first = await generator.next();
    while (!first.done && textOf(first.value) === "") {
      first = await generator.next();
    }
    expect(first.done).toBe(false);
    expect(textOf(first.value as ChatModelRunResult)).toBe("partial");
    controller.abort();

    await expect(generator.next()).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.waitFor(() => expect(handlerSignal?.aborted).toBe(true));
  });

  it("throws with the status and body of a failed response", async () => {
    const adapter = setup({
      "/api/model": {
        POST: () => new Response("model unavailable", { status: 503 }),
      },
    });

    await expect(
      collect(run(adapter, runOptions(new AbortController().signal))),
    ).rejects.toThrow("Status 503: model unavailable");
  });
});
