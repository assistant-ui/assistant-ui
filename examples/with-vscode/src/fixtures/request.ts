import { selectFixture, type FixtureStep } from "./fixtures";

type LooseMessage = {
  role?: string;
  content?: unknown;
  parts?: unknown;
};

export type FixtureRequest = {
  prompt: string;
  toolResults: ReadonlyMap<string, unknown>;
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

/**
 * Reads the prompt and tool results from an AI SDK chat request or a
 * `createVSCodeModelAdapter` request; both carry a `messages` array.
 */
export const readFixtureRequest = (body: unknown): FixtureRequest => {
  const messages =
    typeof body === "object" && body !== null
      ? (body as { messages?: unknown }).messages
      : undefined;
  const list = Array.isArray(messages) ? (messages as LooseMessage[]) : [];
  return { prompt: lastUserText(list), toolResults: toolResultsOf(list) };
};

export const fixtureStepsFor = async (req: Request): Promise<FixtureStep[]> => {
  const input = readFixtureRequest(await req.json());
  return selectFixture(input.prompt).script(input);
};
