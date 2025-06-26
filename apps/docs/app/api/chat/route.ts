import { openai } from "@ai-sdk/openai";
import { jsonSchema, streamText } from "ai";
import { kv } from "@vercel/kv";
import { Ratelimit } from "@upstash/ratelimit";

export const runtime = "edge";
export const maxDuration = 30;

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.fixedWindow(5, "30s"),
});

export async function POST(req: Request) {
  const { messages, tools } = await req.json();
  const ip = req.headers.get("x-forwarded-for") ?? "ip";
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return new Response("Rate limit exceeded", { status: 429 });
  }

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages,
    maxTokens: 1200,
    maxSteps: 10,
    tools: {
      ...Object.fromEntries(
        Object.entries<{ parameters: unknown }>(tools).map(([name, tool]) => [
          name,
          {
            parameters: jsonSchema(tool.parameters!),
          },
        ]),
      ),
    },
    onError: console.error,
  });

  return result.toDataStreamResponse();
}
