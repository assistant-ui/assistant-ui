import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import {
  streamText,
  convertToModelMessages,
  type UIMessage,
  type JSONSchema7,
} from "ai";
import { RESUMABLE_STREAM_ID_HEADER } from "assistant-stream/resumable";
import { resumableContext } from "@/lib/resumable-context";

export async function POST(req: Request) {
  const {
    messages,
    system,
    tools,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
  } = await req.json();

  const streamId = crypto.randomUUID();

  const result = streamText({
    model: openai("gpt-5.4-nano"),
    messages: await convertToModelMessages(messages),
    tools: {
      ...frontendTools(tools ?? {}),
    },
    ...(system === undefined ? {} : { system }),
  });

  const sourceBody = result.toUIMessageStreamResponse().body!;
  const stream = await resumableContext.run(streamId, () => sourceBody);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      [RESUMABLE_STREAM_ID_HEADER]: streamId,
    },
  });
}
