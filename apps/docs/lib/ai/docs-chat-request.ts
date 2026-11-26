import type { UIMessage } from "ai";

/**
 * The docs assistant's request contract. The server owns the prompt and the
 * tool set, so a request carries only the conversation, the page the reader
 * has open and a model choice. Everything else a client sends (`system`,
 * `tools`, `callSettings`) is ignored, and a conversation the docs UI could
 * not have produced is refused before any model call.
 */

/** The tools the docs assistant runs on the server. */
export const DOCS_ASSISTANT_TOOL_NAMES = [
  "listDocs",
  "readDoc",
  "bash",
  "readFile",
] as const;

/** Reader questions in one request; a longer thread starts a new one. */
export const MAX_USER_TURNS = 40;
/** User messages in a row with no reply between them (failed sends). */
export const MAX_CONSECUTIVE_USER_MESSAGES = 4;
/** Image attachments across the whole request. */
export const MAX_IMAGES = 6;
const MAX_PARTS_PER_MESSAGE = 400;
const MAX_ID_CHARS = 200;
const MAX_PAGE_PATH_CHARS = 200;

// The page line the docs UI sends as `system` (AssistantPageContext). Only
// the path is kept, and the server writes the sentence itself.
const PAGE_CONTEXT = /^The user is currently viewing: (\/[A-Za-z0-9\-._~/]*)$/;

const USER_PART_TYPES = new Set(["text", "file"]);
// What the server's own replies contain. A tool name the model made up comes
// back as a dynamic-tool part. Any other part in an assistant message is
// dropped rather than refused, so an old thread stays usable.
const ASSISTANT_PART_TYPES = new Set([
  "text",
  "reasoning",
  "step-start",
  "source-url",
  "source-document",
  "dynamic-tool",
  ...DOCS_ASSISTANT_TOOL_NAMES.map((name) => `tool-${name}`),
]);
const IMAGE_MEDIA_TYPE = /^image\/(png|jpeg|gif|webp)$/;

export type DocChatRequest = {
  messages: UIMessage[];
  pagePath: string | undefined;
  modelName: unknown;
};

// Each refusal's message, keyed by the fixed code that telemetry counts.
const REFUSALS = {
  invalid_request: "Invalid request",
  invalid_messages: "Invalid messages format",
  invalid_message: "Invalid message",
  unsupported_role: "Unsupported message role",
  too_many_parts: "Too many message parts",
  invalid_part: "Invalid message part",
  unsupported_part: "Unsupported message part",
  non_image_file: "Only image attachments are supported",
  too_many_images: "Too many images",
  too_many_turns: "Conversation too long",
  stacked_user_messages: "Invalid message sequence",
  ends_on_assistant: "The last message must be the reader's",
} as const;

export type DocChatRefusal = keyof typeof REFUSALS;

export class DocChatRequestError extends Error {
  readonly code: DocChatRefusal;

  constructor(code: DocChatRefusal) {
    super(REFUSALS[code]);
    this.code = code;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The reader's current page, read from the docs UI's page line. */
export function pagePathFromSystem(system: unknown): string | undefined {
  if (typeof system !== "string") return undefined;
  const match = PAGE_CONTEXT.exec(system);
  const path = match?.[1];
  if (!path || path.length > MAX_PAGE_PATH_CHARS) return undefined;
  return path;
}

function checkUserPart(part: unknown, counts: { images: number }) {
  if (!isRecord(part) || typeof part.type !== "string") {
    throw new DocChatRequestError("invalid_part");
  }
  if (!USER_PART_TYPES.has(part.type)) {
    throw new DocChatRequestError("unsupported_part");
  }
  if (part.type === "text" && typeof part.text !== "string") {
    throw new DocChatRequestError("invalid_part");
  }
  if (part.type === "file") {
    if (
      typeof part.mediaType !== "string" ||
      !IMAGE_MEDIA_TYPE.test(part.mediaType)
    ) {
      throw new DocChatRequestError("non_image_file");
    }
    counts.images += 1;
    if (counts.images > MAX_IMAGES) {
      throw new DocChatRequestError("too_many_images");
    }
  }
}

function checkMessages(value: unknown): UIMessage[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new DocChatRequestError("invalid_messages");
  }

  const counts = { images: 0 };
  let userTurns = 0;
  let userRun = 0;
  const messages: UIMessage[] = [];

  for (const message of value) {
    if (
      !isRecord(message) ||
      typeof message.id !== "string" ||
      message.id.length > MAX_ID_CHARS ||
      !Array.isArray(message.parts)
    ) {
      throw new DocChatRequestError("invalid_message");
    }
    const { role, parts } = message;
    if (role !== "user" && role !== "assistant") {
      throw new DocChatRequestError("unsupported_role");
    }
    if (parts.length > MAX_PARTS_PER_MESSAGE) {
      throw new DocChatRequestError("too_many_parts");
    }

    if (role === "user") {
      for (const part of parts) checkUserPart(part, counts);
      userTurns += 1;
      userRun += 1;
      if (userTurns > MAX_USER_TURNS) {
        throw new DocChatRequestError("too_many_turns");
      }
      if (userRun > MAX_CONSECUTIVE_USER_MESSAGES) {
        throw new DocChatRequestError("stacked_user_messages");
      }
      messages.push(message as unknown as UIMessage);
    } else {
      userRun = 0;
      messages.push({
        ...(message as unknown as UIMessage),
        parts: parts.filter(
          (part): part is UIMessage["parts"][number] =>
            isRecord(part) &&
            typeof part.type === "string" &&
            ASSISTANT_PART_TYPES.has(part.type),
        ),
      });
    }
  }

  // The docs UI always ends on the reader's question: the server finishes
  // every answer itself, so the client never sends a turn back to continue.
  if (messages.at(-1)?.role !== "user") {
    throw new DocChatRequestError("ends_on_assistant");
  }

  return messages;
}

/** Reads a docs assistant request body, or throws a `DocChatRequestError`. */
export function readDocChatRequest(body: unknown): DocChatRequest {
  if (!isRecord(body)) throw new DocChatRequestError("invalid_request");
  const config = isRecord(body.config) ? body.config : undefined;
  return {
    messages: checkMessages(body.messages),
    pagePath: pagePathFromSystem(body.system),
    modelName: config?.modelName,
  };
}

/** The last user message's text, for server-side classification only. */
export function latestQuestionText(messages: readonly UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role !== "user") continue;
    return message.parts
      .flatMap((part) => (part.type === "text" ? [part.text] : []))
      .join("\n");
  }
  return "";
}
