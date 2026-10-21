import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  DefaultChatTransport,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RouteHandler } from "../host/router";
import { serveWebviewRoutes } from "../host/serve";
import { createInMemoryBridge } from "../testUtils";
import { createVSCodeFetch } from "./fetch";

const disposers: (() => void)[] = [];
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
});

const setup = (POST: RouteHandler) => {
  const bridge = createInMemoryBridge();
  const server = serveWebviewRoutes(bridge.webview, {
    "/api/chat": { POST },
  });
  disposers.push(() => server.dispose());
  return new DefaultChatTransport<UIMessage>({
    api: "/api/chat",
    fetch: createVSCodeFetch(bridge.port),
  });
};

const userMessage: UIMessage = {
  id: "m1",
  role: "user",
  parts: [{ type: "text", text: "Hello" }],
};

const collect = async (stream: ReadableStream<UIMessageChunk>) => {
  const chunks: UIMessageChunk[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks;
};

describe("AI SDK route handler over the bridge", () => {
  it("streams a UI message stream response to DefaultChatTransport", async () => {
    let body: { id: string; messages: UIMessage[] } | undefined;
    const transport = setup(async (req) => {
      body = (await req.json()) as typeof body;
      return createUIMessageStreamResponse({
        stream: createUIMessageStream({
          execute: async ({ writer }) => {
            writer.write({ type: "start" });
            writer.write({ type: "text-start", id: "t" });
            for (const delta of ["Hel", "lo ", "wörld 🌍"]) {
              writer.write({ type: "text-delta", id: "t", delta });
              await new Promise((resolve) => setTimeout(resolve, 5));
            }
            writer.write({ type: "text-end", id: "t" });
            writer.write({ type: "finish" });
          },
        }),
      });
    });

    const stream = await transport.sendMessages({
      trigger: "submit-message",
      chatId: "chat-1",
      messageId: undefined,
      messages: [userMessage],
      abortSignal: undefined,
    });
    const chunks = await collect(stream);

    expect(body?.id).toBe("chat-1");
    expect(body?.messages).toEqual([userMessage]);
    const text = chunks
      .map((chunk) => (chunk.type === "text-delta" ? chunk.delta : ""))
      .join("");
    expect(text).toBe("Hello wörld 🌍");
    expect(chunks.at(-1)?.type).toBe("finish");
  });

  it("cancels the route handler when the transport is aborted", async () => {
    let handlerSignal: AbortSignal | undefined;
    const transport = setup((req) => {
      handlerSignal = req.signal;
      return createUIMessageStreamResponse({
        stream: createUIMessageStream({
          execute: async ({ writer }) => {
            writer.write({ type: "text-start", id: "t" });
            writer.write({ type: "text-delta", id: "t", delta: "partial" });
            await new Promise((resolve) =>
              req.signal.addEventListener("abort", resolve),
            );
          },
        }),
      });
    });
    const controller = new AbortController();

    const stream = await transport.sendMessages({
      trigger: "submit-message",
      chatId: "chat-1",
      messageId: undefined,
      messages: [userMessage],
      abortSignal: controller.signal,
    });
    const reader = stream.getReader();
    let chunk = await reader.read();
    while (!chunk.done && chunk.value.type !== "text-delta") {
      chunk = await reader.read();
    }
    controller.abort();

    await expect(reader.read()).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(handlerSignal?.aborted).toBe(true));
  });
});
