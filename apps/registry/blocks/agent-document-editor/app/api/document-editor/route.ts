import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/ai-sdk";
import {
  type JSONSchema7,
  streamText,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { DOCUMENT_EDITOR_INSTRUCTIONS } from "@/lib/document-editor/prompts";

export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    messages,
    tools,
  }: {
    messages: UIMessage[];
    tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
  } = await req.json();

  const aiSDKTools = { ...frontendTools(tools ?? {}) };
  const result = streamText({
    abortSignal: req.signal,
    model: openai("gpt-6-luna"),
    system: DOCUMENT_EDITOR_INSTRUCTIONS,
    messages: await convertToModelMessages(messages, { tools: aiSDKTools }),
    tools: aiSDKTools,
  });

  return result.toUIMessageStreamResponse({
    onError: (error) =>
      error instanceof Error ? error.message : String(error),
  });
}
