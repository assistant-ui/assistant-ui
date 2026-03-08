import type { UIMessage } from "ai";

/**
 * Injects quote context into UIMessages before they are converted to model messages.
 *
 * When a message has `metadata.custom.quote`, the quoted text is prepended
 * as a text part so the LLM can see the referenced context.
 */
export function injectQuoteContext(messages: UIMessage[]): UIMessage[] {
  return messages.map((msg) => {
    const quote = (msg.metadata as Record<string, unknown> | undefined)?.custom;
    if (
      !quote ||
      typeof quote !== "object" ||
      !("quote" in (quote as Record<string, unknown>))
    )
      return msg;

    const q = (quote as Record<string, unknown>).quote;
    if (
      !q ||
      typeof q !== "object" ||
      !("text" in (q as Record<string, unknown>))
    )
      return msg;

    const text = (q as { text: unknown }).text;
    if (typeof text !== "string") return msg;

    return {
      ...msg,
      parts: [{ type: "text" as const, text: `> ${text}\n\n` }, ...msg.parts],
    };
  });
}
