import type {
  ChatModelRunOptions,
  ChatModelRunResult,
  ThreadMessage,
} from "@assistant-ui/react";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./api/backend/chat/route";
import { backendAdapter } from "./backend-adapter";

const { models } = vi.hoisted(() => ({ models: [] as unknown[] }));

vi.mock("@ai-sdk/openai", async (importOriginal) => ({
  ...(await importOriginal()),
  openai: () => models.shift(),
}));

const usage = {
  inputTokens: {
    total: 1,
    noCache: 1,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

const replyWith = (...deltas: string[]) =>
  new MockLanguageModelV4({
    doStream: {
      stream: simulateReadableStream({
        chunkDelayInMs: 5,
        chunks: [
          { type: "text-start" as const, id: "t" },
          ...deltas.map((delta) => ({
            type: "text-delta" as const,
            id: "t",
            delta,
          })),
          { type: "text-end" as const, id: "t" },
          {
            type: "finish" as const,
            finishReason: { unified: "stop" as const, raw: undefined },
            usage,
          },
        ],
      }),
    },
  });

const message = (role: "user" | "assistant", text: string) =>
  ({ role, content: [{ type: "text", text }] }) as unknown as ThreadMessage;

async function run(messages: ThreadMessage[]) {
  const results: ChatModelRunResult[] = [];
  const stream = backendAdapter.run({
    messages,
    abortSignal: new AbortController().signal,
  } as unknown as ChatModelRunOptions) as AsyncGenerator<ChatModelRunResult>;
  for await (const result of stream) results.push(result);
  return results;
}

const fetchToRoute = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
  POST(new Request(new URL(String(input), "http://localhost"), init)),
);

beforeEach(() => {
  models.length = 0;
  vi.stubGlobal("fetch", fetchToRoute);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("own backend recipe", () => {
  it("streams the backend's text into the assistant message", async () => {
    const model = replyWith("Hel", "lo!");
    models.push(model);

    const results = await run([message("user", "Hi")]);

    expect(results.map((result) => result.content)).toEqual([
      [{ type: "text", text: "Hel" }],
      [{ type: "text", text: "Hello!" }],
    ]);
    expect(model.doStreamCalls[0]?.prompt).toEqual([
      { role: "user", content: [{ type: "text", text: "Hi" }] },
    ]);
  });

  it("sends the conversation in the backend's own format", async () => {
    models.push(replyWith("ok"));

    await run([
      message("user", "Hi"),
      message("assistant", "Hello!"),
      message("user", "Bye"),
    ]);

    const body = JSON.parse(String(fetchToRoute.mock.calls.at(-1)?.[1]?.body));
    expect(body).toEqual({
      messages: [
        { role: "user", text: "Hi" },
        { role: "assistant", text: "Hello!" },
        { role: "user", text: "Bye" },
      ],
    });
  });

  it("refuses cross-origin requests before calling the model", async () => {
    const response = await POST(
      new Request("http://localhost/api/backend/chat", {
        method: "POST",
        headers: { "sec-fetch-site": "cross-site" },
        body: JSON.stringify({ messages: [{ role: "user", text: "Hi" }] }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("answers a malformed request with 400", async () => {
    const response = await POST(
      new Request("http://localhost/api/backend/chat", {
        method: "POST",
        body: JSON.stringify({ messages: [{ role: "robot" }] }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("surfaces a failed backend call as an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("down", { status: 503 })),
    );

    await expect(run([message("user", "Hi")])).rejects.toThrow("503");
  });
});
