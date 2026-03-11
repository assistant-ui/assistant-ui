import type { UIMessage } from "ai";

const getQuoteText = (metadata: unknown): string | undefined => {
  if (!metadata || typeof metadata !== "object") return undefined;

  const custom = (metadata as Record<string, unknown>).custom;
  if (!custom || typeof custom !== "object") return undefined;

  const quote = (custom as Record<string, unknown>).quote;
  if (!quote || typeof quote !== "object") return undefined;

  const text = (quote as Record<string, unknown>).text;
  return typeof text === "string" ? text : undefined;
};

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

    const text = getQuoteText(msg.metadata);
    if (!text) return msg;

    const blockquote = text
      .split(/\r?\n/)
      .map((line) => `> ${line}`)
      .join("\n");

    const alreadyInjected =
      msg.parts[0]?.type === "text" &&
      msg.parts[0].text === `${blockquote}\n\n`;
    if (alreadyInjected) return msg;

    return {
      ...msg,
      parts: [
        { type: "text" as const, text: `${blockquote}\n\n` },
        ...(msg.parts ?? []),
      ],
    };
  });
}
