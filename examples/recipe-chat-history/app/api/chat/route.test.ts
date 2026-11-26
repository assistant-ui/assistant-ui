import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

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

const textModel = (text: string) =>
  new MockLanguageModelV4({
    doStream: {
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start" as const, id: "t" },
          { type: "text-delta" as const, id: "t", delta: text },
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

const chatRequest = (headers: Record<string, string>) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    headers,
    body: JSON.stringify({
      messages: [
        { id: "u1", role: "user", parts: [{ type: "text", text: "Hi" }] },
      ],
    }),
  });

beforeEach(() => {
  models.length = 0;
});

describe("chat route", () => {
  it("streams the model's reply to the saved conversation", async () => {
    const model = textModel("Hello!");
    models.push(model);

    const response = await POST(
      chatRequest({ "sec-fetch-site": "same-origin" }),
    );

    expect(await response.text()).toContain('"delta":"Hello!"');
    expect(model.doStreamCalls[0]?.prompt).toEqual([
      { role: "user", content: [{ type: "text", text: "Hi" }] },
    ]);
  });

  it("refuses cross-origin requests before calling the model", async () => {
    const response = await POST(
      chatRequest({ "sec-fetch-site": "cross-site" }),
    );

    expect(response.status).toBe(403);
    expect(models).toHaveLength(0);
  });
});
