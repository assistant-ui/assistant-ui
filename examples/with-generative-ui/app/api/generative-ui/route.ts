import { frontendTools } from "@assistant-ui/ai-sdk";
import {
  convertToModelMessages,
  gateway,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { searchFlights, searchImages } from "@/lib/data-tools";
import { DEFAULT_MODEL, isModelId } from "@/lib/models";

export const maxDuration = 300;

export async function POST(req: Request) {
  const {
    messages,
    system,
    tools: clientTools,
    model,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: Parameters<typeof frontendTools>[0];
    model?: string;
  } = await req.json();

  const tools = {
    ...frontendTools(clientTools ?? {}),
    search_flights: searchFlights,
    search_images: searchImages,
  };
  const result = streamText({
    abortSignal: req.signal,
    model: gateway(isModelId(model) ? model : DEFAULT_MODEL),
    messages: await convertToModelMessages(messages, { tools }),
    stopWhen: stepCountIs(10),
    ...(system ? { system } : {}),
    tools,
  });

  return result.toUIMessageStreamResponse();
}
