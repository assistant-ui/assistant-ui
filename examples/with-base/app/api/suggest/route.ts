import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { ROUTE_MODEL } from "@/lib/models";

export const maxDuration = 30;

const bodySchema = z.object({ prompt: z.string().min(1).max(20_000) });

/* Writes the follow-up prompts shown under a reply, one to a line. */
export async function POST(req: Request) {
  const body = bodySchema.safeParse(await req.json().catch(() => undefined));
  if (!body.success) {
    return new Response("The request body is not a suggestion request.", {
      status: 400,
    });
  }
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    return new Response(
      "No model key is set. Copy .env.example to .env.local and add one.",
      { status: 401 },
    );
  }

  const { text } = await generateText({
    abortSignal: req.signal,
    model: createOpenAI({ apiKey })(ROUTE_MODEL),
    prompt: body.data.prompt,
  });
  const suggestions = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);
  return Response.json({ suggestions });
}
