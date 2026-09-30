import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { playFixture, selectFixture } from "./fixtures";

type LooseMessage = {
  role?: string;
  content?: unknown;
  parts?: unknown;
};

const partsOf = (message: LooseMessage): Record<string, unknown>[] => {
  const parts = message.parts ?? message.content;
  if (typeof parts === "string") return [{ type: "text", text: parts }];
  return Array.isArray(parts) ? parts : [];
};

const lastUserText = (messages: readonly LooseMessage[]) => {
  const last = messages.findLast((m) => m.role === "user");
  if (!last) return "";
  return partsOf(last)
    .map((part) =>
      part["type"] === "text" && typeof part["text"] === "string"
        ? part["text"]
        : "",
    )
    .join("");
};

const toolResultsOf = (messages: readonly LooseMessage[]) => {
  const results = new Map<string, unknown>();
  for (const message of messages) {
    for (const part of partsOf(message)) {
      const id = part["toolCallId"];
      const result = part["output"] ?? part["result"];
      if (typeof id === "string" && result !== undefined) {
        results.set(id, result);
      }
    }
  }
  return results;
};

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as { messages?: LooseMessage[] };
  const messages = body.messages ?? [];
  const prompt = lastUserText(messages);
  const steps = selectFixture(prompt).script({
    prompt,
    toolResults: toolResultsOf(messages),
  });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      let openText: string | undefined;
      const closeText = () => {
        if (openText === undefined) return;
        writer.write({ type: "text-end", id: openText });
        openText = undefined;
      };

      for await (const event of playFixture(steps, { signal: req.signal })) {
        switch (event.type) {
          case "text-delta":
            if (openText !== event.id) {
              closeText();
              openText = event.id;
              writer.write({ type: "text-start", id: event.id });
            }
            writer.write({
              type: "text-delta",
              id: event.id,
              delta: event.delta,
            });
            break;
          case "tool-call":
            closeText();
            writer.write({
              type: "tool-input-available",
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              input: event.args,
            });
            break;
          case "tool-result":
            writer.write({
              type: "tool-output-available",
              toolCallId: event.toolCallId,
              output: event.result,
            });
            break;
          case "error":
            closeText();
            writer.write({ type: "error", errorText: event.message });
            return;
        }
      }
      closeText();
    },
  });

  return createUIMessageStreamResponse({ stream });
}
