import { injectQuoteContext } from "@assistant-ui/ai-sdk";
import {
  convertToModelMessages,
  pruneMessages,
  streamText,
  type ModelMessage,
  type TextStreamPart,
  type ToolSet,
  type UIMessage,
} from "ai";
import { getDistinctId } from "@/lib/posthog-server";
import type { resolveChatModel } from "./provider";
import { posthogTelemetry } from "./telemetry";

export async function prepareChatMessages(
  messages: UIMessage[],
  tools: ToolSet,
) {
  return pruneMessages({
    messages: await convertToModelMessages(messages, { tools }),
    reasoning: "none",
  });
}

export async function prepareDocChatMessages(
  messages: readonly UIMessage[],
  tools: ToolSet,
) {
  return pruneMessages({
    messages: await convertToModelMessages(injectQuoteContext([...messages]), {
      tools,
    }),
    toolCalls: "before-last-2-messages",
    reasoning: "none",
    emptyMessages: "remove",
  });
}

type ChatStreamOptions = Omit<
  Parameters<typeof streamText>[0],
  | "abortSignal"
  | "model"
  | "providerOptions"
  | "runtimeContext"
  | "telemetry"
  | "prompt"
> & { messages: ModelMessage[] };

function messageMetadata({ part }: { part: TextStreamPart<ToolSet> }) {
  if (part.type === "finish-step") return { modelId: part.response.modelId };
  if (part.type === "finish") return { usage: part.totalUsage };
  return undefined;
}

export function streamDocsChat(
  req: Request,
  modelConfig: ReturnType<typeof resolveChatModel>,
  telemetry: { spanName: string; source: string },
  options: ChatStreamOptions,
) {
  const result = streamText({
    ...options,
    abortSignal: req.signal,
    model: modelConfig.model,
    ...(modelConfig.providerOptions
      ? { providerOptions: modelConfig.providerOptions }
      : {}),
    ...posthogTelemetry({ distinctId: getDistinctId(req), ...telemetry }),
    onError: options.onError ?? (({ error }) => console.error(error)),
  });
  return { result, messageMetadata };
}
