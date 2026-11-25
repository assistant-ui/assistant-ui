import type { ThreadMessage } from "@assistant-ui/react";

/** Helpers the scripted demos share in place of a model. */

export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function lastUserText(messages: readonly ThreadMessage[]) {
  const message = messages.findLast((entry) => entry.role === "user");
  return (message?.content ?? [])
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .trim();
}

/** Yields `text` a word at a time, each step the full text so far. */
export async function* streamWords(
  text: string,
  signal: AbortSignal,
  delay = 30,
) {
  let shown = "";
  for (const word of text.split(/(?<=\s)/)) {
    if (signal.aborted) return;
    shown += word;
    yield shown;
    await wait(delay);
  }
}
