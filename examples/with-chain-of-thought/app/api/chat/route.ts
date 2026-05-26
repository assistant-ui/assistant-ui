import { openai } from "@ai-sdk/openai";
import {
  streamText,
  convertToModelMessages,
  tool,
  stepCountIs,
  zodSchema,
  createUIMessageStream,
  JsonToSseTransformStream,
} from "ai";
import type { UIMessage, UIMessageStreamWriter } from "ai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { z } from "zod";

export const maxDuration = 30;

type SearchResult = { id: string; url: string; title: string };

const searchSources = (query: string): SearchResult[] => {
  const q = query.toLowerCase();
  if (q.includes("fibonacci")) {
    return [
      {
        id: "src-fib-1",
        url: "https://en.wikipedia.org/wiki/Fibonacci_number",
        title: "Fibonacci number (Wikipedia)",
      },
      {
        id: "src-fib-2",
        url: "https://oeis.org/A000045",
        title: "OEIS A000045: Fibonacci numbers",
      },
    ];
  }
  if (
    q.includes("renewable") ||
    q.includes("energy") ||
    q.includes("climate")
  ) {
    return [
      {
        id: "src-iea",
        url: "https://www.iea.org/reports/renewables-2024",
        title: "IEA Renewables 2024",
      },
      {
        id: "src-irena",
        url: "https://www.irena.org/Publications",
        title: "IRENA Publications",
      },
    ];
  }
  return [
    {
      id: "src-wiki",
      url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`,
      title: "Wikipedia search results",
    },
    {
      id: "src-web",
      url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      title: `Web results for: ${query}`,
    },
  ];
};

export async function POST(req: Request) {
  const {
    messages,
    tools,
  }: { messages: UIMessage[]; tools: Record<string, any> } = await req.json();

  const uiStream = createUIMessageStream({
    execute: async ({ writer }) => {
      if (!process.env.OPENAI_API_KEY) {
        await streamFallback(writer, messages);
        return;
      }
      await streamModel(writer, messages, tools);
    },
  });

  return new Response(
    uiStream
      .pipeThrough(new JsonToSseTransformStream())
      .pipeThrough(new TextEncoderStream()),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    },
  );
}

async function streamModel(
  writer: UIMessageStreamWriter,
  messages: UIMessage[],
  frontendToolDefs: Record<string, any>,
) {
  const toolNameByCall = new Map<string, string>();

  const result = streamText({
    // Reasoning model so the chain-of-thought group has real content.
    model: openai("gpt-5.4-mini"),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    tools: {
      ...frontendTools(frontendToolDefs),
      get_current_weather: tool({
        description: "Get the current weather for a city",
        inputSchema: zodSchema(z.object({ city: z.string() })),
        execute: async ({ city }) => `The weather in ${city} is sunny, 72°F`,
      }),
      search_web: tool({
        description:
          "Search the web for citations on a topic. Returns a list of source URLs and titles the assistant should consult.",
        inputSchema: zodSchema(z.object({ query: z.string() })),
        execute: async ({ query }) => ({ sources: searchSources(query) }),
      }),
    },
    providerOptions: {
      openai: {
        reasoningEffort: "high",
        reasoningSummary: "auto",
      },
    },
  });

  // Forward model chunks, then synthesize `source-url` parts from each
  // `search_web` tool output so the UI renders them as `source` parts. OpenAI
  // does not natively emit `source-url` chunks without web search, so the route
  // produces them deterministically from the tool result.
  for await (const chunk of result.toUIMessageStream({ sendReasoning: true })) {
    writer.write(chunk);

    if (chunk.type === "tool-input-available") {
      toolNameByCall.set(chunk.toolCallId, chunk.toolName);
    }
    if (
      chunk.type === "tool-output-available" &&
      toolNameByCall.get(chunk.toolCallId) === "search_web"
    ) {
      const output = chunk.output as { sources?: SearchResult[] };
      for (const source of output.sources ?? []) {
        writer.write({
          type: "source-url",
          sourceId: source.id,
          url: source.url,
          title: source.title,
        });
      }
    }
  }
}

async function streamFallback(
  writer: UIMessageStreamWriter,
  messages: UIMessage[],
) {
  const lastUserText =
    messages
      .filter((m) => m.role === "user")
      .at(-1)
      ?.parts.flatMap((p) => (p.type === "text" ? [p.text] : []))
      .join(" ") ?? "your question";

  const messageId = `msg-${crypto.randomUUID()}`;
  const reasoningId = `r-${crypto.randomUUID()}`;
  const textId = `t-${crypto.randomUUID()}`;
  const toolCallId = `call-${crypto.randomUUID()}`;
  const sources = searchSources(lastUserText);

  writer.write({ type: "start", messageId });
  writer.write({ type: "start-step" });

  writer.write({ type: "reasoning-start", id: reasoningId });
  const reasoning =
    "OPENAI_API_KEY is not set, so this response is generated deterministically by the route. " +
    "A real run emits the same chunk shapes from the model: a reasoning step, " +
    "a search_web tool call, source-url parts derived from the tool output, " +
    "and a final answer that summarises the sources.";
  for (const word of reasoning.split(/(\s+)/)) {
    if (!word) continue;
    writer.write({ type: "reasoning-delta", id: reasoningId, delta: word });
    await sleep(15);
  }
  writer.write({ type: "reasoning-end", id: reasoningId });

  writer.write({
    type: "tool-input-available",
    toolCallId,
    toolName: "search_web",
    input: { query: lastUserText },
  });
  await sleep(150);
  writer.write({
    type: "tool-output-available",
    toolCallId,
    output: { sources },
  });

  for (const source of sources) {
    writer.write({
      type: "source-url",
      sourceId: source.id,
      url: source.url,
      title: source.title,
    });
  }

  writer.write({ type: "text-start", id: textId });
  const answer =
    `\n\nMock answer for: "${lastUserText}". ` +
    "The badges above are structured `source` message parts emitted as " +
    "`source-url` chunks, not URLs scraped from text. Set `OPENAI_API_KEY` " +
    "to switch to a real model run.";
  for (const word of answer.split(/(\s+)/)) {
    if (!word) continue;
    writer.write({ type: "text-delta", id: textId, delta: word });
    await sleep(15);
  }
  writer.write({ type: "text-end", id: textId });

  writer.write({ type: "finish-step" });
  writer.write({ type: "finish" });
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
