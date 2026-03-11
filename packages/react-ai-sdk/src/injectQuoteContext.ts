import type { UIMessage } from "ai";

/**
 * Injects quote context into messages as markdown blockquotes.
 *
 * Use this in your route handler before `convertToModelMessages` so the LLM
 * sees the quoted text that the user is referring to.
 *
 * @example
 * ```ts
 * import { convertToModelMessages, streamText } from "ai";
 * import { injectQuoteContext } from "@assistant-ui/react-ai-sdk";
 *
 * export async function POST(req: Request) {
 *   const { messages } = await req.json();
 *   const result = streamText({
 *     model: myModel,
 *     messages: await convertToModelMessages(injectQuoteContext(messages)),
 *   });
 *   return result.toUIMessageStreamResponse();
 * }
 * ```
 */
export function injectQuoteContext(messages: UIMessage[]): UIMessage[] {
  return messages.map((msg) => {
    if (msg.role !== "user") return msg;

    const custom = (msg.metadata as Record<string, unknown> | undefined)
      ?.custom;
    if (
      !custom ||
      typeof custom !== "object" ||
      !("quote" in (custom as Record<string, unknown>))
    )
      return msg;

    const quote = (custom as Record<string, unknown>).quote;
    if (
      !quote ||
      typeof quote !== "object" ||
      !("text" in (quote as Record<string, unknown>))
    )
      return msg;

    const text = (quote as { text: unknown }).text;
    if (typeof text !== "string") return msg;

    const blockquote = text
      .split(/\r?\n/)
      .map((line) => `> ${line}`)
      .join("\n");

    return {
      ...msg,
      parts: [
        { type: "text" as const, text: `${blockquote}\n\n` },
        ...(msg.parts ?? []),
      ],
    };
  });
}
