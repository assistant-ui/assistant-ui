import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs } from "ai";
import data from "../../data.json";

export const maxDuration = 120;

const SYSTEM = `You are carrying out a task a person scheduled earlier. Nobody is in the chat to answer questions, so do the task and give the result.

- Search the web when the task needs something current, such as news, prices or weather.
- Answer in plain text, with no Markdown: short paragraphs, or lines that start with a dash.
- Keep it short enough to read in half a minute.`;

const bodySchema = z.object({
  title: z.string().max(120),
  prompt: z.string().min(1).max(2000),
});

/* Carries out one run of a task and answers with what it produced. */
export async function POST(req: Request) {
  // Any route file under app/ is a public endpoint on the site that serves it, so this one stays off unless switched on.
  if (process.env["BLOCKS_LIVE_API"] !== "true") {
    return new Response(
      'Running tasks is switched off here. Set BLOCKS_LIVE_API to "true" to turn it on.',
      { status: 404 },
    );
  }
  if (!process.env["OPENAI_API_KEY"]) {
    return new Response(
      "No model key is set. Copy .env.example to .env.local and add one.",
      { status: 401 },
    );
  }
  const body = bodySchema.safeParse(await req.json().catch(() => undefined));
  if (!body.success) {
    return new Response("The request body is not a task run.", { status: 400 });
  }

  const { text, totalUsage } = await generateText({
    abortSignal: req.signal,
    model: openai(data.model),
    system: SYSTEM,
    prompt: `Task: ${body.data.title}\n\n${body.data.prompt}\n\nThe time now is ${new Date().toISOString()}.`,
    tools: { web_search: openai.tools.webSearch({}) },
    stopWhen: stepCountIs(4),
  });

  return Response.json({ text, tokens: totalUsage.totalTokens ?? 0 });
}
