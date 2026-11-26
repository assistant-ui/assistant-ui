import {
  parseJsonEventStream,
  readUIMessageStream,
  uiMessageChunkSchema,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./api/chat/route";
import { WeatherCard } from "./weather-card";

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

const finish = (unified: "stop" | "tool-calls") => ({
  type: "finish" as const,
  finishReason: { unified, raw: undefined },
  usage,
});

// Scripted model: it calls getWeather first and answers in text once the result is in the prompt.
const scriptedModel = () =>
  new MockLanguageModelV4({
    doStream: async ({ prompt }) => ({
      stream: prompt.some((message) => message.role === "tool")
        ? simulateReadableStream({
            chunks: [
              { type: "text-start" as const, id: "t" },
              { type: "text-delta" as const, id: "t", delta: "Sunny." },
              { type: "text-end" as const, id: "t" },
              finish("stop"),
            ],
          })
        : simulateReadableStream({
            chunks: [
              {
                type: "tool-call" as const,
                toolCallId: "call_1",
                toolName: "getWeather",
                input: JSON.stringify({ city: "Lisbon" }),
              },
              finish("tool-calls"),
            ],
          }),
    }),
  });

async function chat(text: string) {
  models.push(scriptedModel());
  const response = await POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "sec-fetch-site": "same-origin" },
      body: JSON.stringify({
        messages: [{ id: "u1", role: "user", parts: [{ type: "text", text }] }],
      }),
    }),
  );
  const chunks = parseJsonEventStream({
    stream: response.body!,
    schema: uiMessageChunkSchema,
  }).pipeThrough(
    new TransformStream({
      transform(result, controller) {
        if (!result.success) throw result.error;
        controller.enqueue(result.value as UIMessageChunk);
      },
    }),
  );
  let message: UIMessage | undefined;
  for await (const snapshot of readUIMessageStream({ stream: chunks })) {
    message = snapshot;
  }
  return message!;
}

type CardProps = ComponentProps<typeof WeatherCard>;

const renderCard = (props: Partial<CardProps>) =>
  renderToStaticMarkup(
    <WeatherCard
      {...({
        args: { city: "Lisbon" },
        status: { type: "running" },
        ...props,
      } as CardProps)}
    />,
  );

beforeEach(() => {
  models.length = 0;
});

describe("tool UI recipe", () => {
  it("streams the getWeather call with the server's result", async () => {
    const message = await chat("What's the weather in Lisbon?");

    const part = message.parts.find((p) => p.type === "tool-getWeather");
    expect(part).toMatchObject({
      state: "output-available",
      input: { city: "Lisbon" },
      output: { city: "Lisbon", temperatureC: 21, condition: "Sunny" },
    });
  });

  it("shows a loading line while the tool runs", () => {
    expect(renderCard({})).toContain("Checking the weather in Lisbon");
  });

  it("shows the weather card once the result arrives", () => {
    const html = renderCard({
      status: { type: "complete" },
      result: {
        city: "Lisbon",
        temperatureC: 21,
        condition: "Sunny",
        humidity: 40,
      },
    });

    expect(html).toContain("21°C");
    expect(html).toContain("Sunny");
  });
});
