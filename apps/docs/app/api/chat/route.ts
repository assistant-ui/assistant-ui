import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { kv } from "@vercel/kv";
import { Ratelimit } from "@upstash/ratelimit";
import { frontendTools } from "@assistant-ui/react-ai-sdk";

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
    messages: convertToModelMessages(messages),
    maxOutputTokens: 1200,
    stopWhen: stepCountIs(10),
    tools: {
      ...frontendTools(tools),
    },
    onError: console.error,
  });

  return result.toUIMessageStreamResponse();
}
