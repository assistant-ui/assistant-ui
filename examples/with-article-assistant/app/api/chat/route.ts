import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { articleText } from "@/lib/article";

export const maxDuration = 30;

const INSTRUCTIONS = `You are the reading assistant for one article, shown behind this chat. Answer questions about that article only.

Rules:
- Base every answer on the article text below. Quote or paraphrase it, and name who said what.
- If the answer is not in the article, say so plainly ("The article doesn't say."). Do not guess, invent details or use outside knowledge to fill gaps. You may then point to the closest thing the article does say.
- The article is fiction. If asked, say it is a made-up story; otherwise just answer within it.
- Keep answers short: a few sentences or a short list.

<article>
${articleText}
</article>`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const result = streamText({
    abortSignal: req.signal,
    // A plain model string: the AI SDK's default provider resolves it
    // (the Vercel AI Gateway on Vercel).
    model: "openai/gpt-5",
    system: INSTRUCTIONS,
    messages: await convertToModelMessages(messages),
  });
  return result.toUIMessageStreamResponse();
}
