import type { UIMessage } from "ai";
import {
  formatInteractableSnapshot,
  getInteractableSnapshots,
  type InteractableSnapshotEntry,
} from "@assistant-ui/core";

/**
 * Injects interactable state snapshots into messages as model-visible text.
 *
 * Mirrors {@link injectQuoteContext}: reads the frozen snapshot stamped on a user
 * message's `metadata.custom.interactables` (by the interactables scope at send
 * time) and prepends a text part. Run this in your route handler before
 * `convertToModelMessages`, which otherwise ignores `metadata.custom`.
 *
 * Wording is consumer-owned — pass `format` to control how each snapshot reads.
 * A snapshot may originate from a user edit or an agent `update_*` call, so the
 * default phrasing is neutral. Keep the instance id visible in custom wording:
 * the model needs it to address the `update_*` tool's `id` parameter. A custom
 * `format` must also handle entries with `partial: true`, whose `state` carries
 * only the fields that changed since the model's last known state.
 *
 * @example
 * ```ts
 * import { convertToModelMessages, streamText } from "ai";
 * import { injectInteractableContext } from "@assistant-ui/react-ai-sdk";
 *
 * export async function POST(req: Request) {
 *   const { messages } = await req.json();
 *   const result = streamText({
 *     model: myModel,
 *     messages: await convertToModelMessages(injectInteractableContext(messages)),
 *   });
 *   return result.toUIMessageStreamResponse();
 * }
 * ```
 */
export function injectInteractableContext(
  messages: UIMessage[],
  format: (
    item: InteractableSnapshotEntry,
  ) => string = formatInteractableSnapshot,
): UIMessage[] {
  return messages.map((msg) => {
    if (msg.role !== "user") return msg;

    const items = getInteractableSnapshots(msg);
    if (!items?.length) return msg;

    const text = `${items.map(format).join("\n")}\n\n`;

    const alreadyInjected =
      msg.parts[0]?.type === "text" && msg.parts[0].text === text;
    if (alreadyInjected) return msg;

    return {
      ...msg,
      parts: [{ type: "text" as const, text }, ...(msg.parts ?? [])],
    };
  });
}
