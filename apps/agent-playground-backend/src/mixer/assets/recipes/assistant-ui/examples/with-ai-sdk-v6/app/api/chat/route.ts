import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import {
  type JSONSchema7,
  streamText,
  convertToModelMessages,
  type UIMessage,
  tool,
  stepCountIs,
  zodSchema,
} from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

type ChatRequestBody = {
  messages: UIMessage[];
  system?: string;
  tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
};

function jsonError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isToolMap(
  value: unknown,
): value is Record<string, { description?: string; parameters: JSONSchema7 }> {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;

  return Object.values(value).every(
    (toolValue) =>
      isRecord(toolValue) &&
      (toolValue.description === undefined ||
        typeof toolValue.description === "string") &&
      isRecord(toolValue.parameters),
  );
}

function parseChatRequestBody(body: unknown): ChatRequestBody | Response {
  if (!isRecord(body)) return jsonError("Request body must be a JSON object.");
  if (!Array.isArray(body.messages)) {
    return jsonError('Request body must include a "messages" array.');
  }
  if (!body.messages.every(isRecord)) {
    return jsonError('Each "messages" entry must be an object.');
  }
  if (body.system !== undefined && typeof body.system !== "string") {
    return jsonError('"system" must be a string when provided.');
  }
  if (!isToolMap(body.tools)) {
    return jsonError('"tools" must be an object keyed by tool name.');
  }

  return {
    messages: body.messages as UIMessage[],
    ...(body.system ? { system: body.system } : {}),
    ...(body.tools ? { tools: body.tools } : {}),
  };
}

export async function POST(req: Request) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return jsonError("Request body must be valid JSON.");
  }

  const body = parseChatRequestBody(rawBody);
  if (body instanceof Response) return body;

  let modelMessages;
  try {
    modelMessages = await convertToModelMessages(body.messages);
  } catch {
    return jsonError('"messages" must be valid UI messages.');
  }

  const result = streamText({
    model: openai("gpt-4o"),
    messages: modelMessages,
    ...(body.system ? { system: body.system } : {}),
    stopWhen: stepCountIs(10),
    tools: {
      ...frontendTools(body.tools ?? {}),
      get_current_weather: tool({
        description: "Get the current weather",
        inputSchema: zodSchema(
          z.object({
            city: z.string(),
          }),
        ),
        execute: async ({ city }) => {
          return `The weather in ${city} is sunny`;
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
