import type { JsonSchema } from "../json-schema";
import type { AgentMessage, AgentModelEvent, WidgetAgentModel } from "./model";

/** The parts of an AI SDK `fullStream`/`stream` part this adapter reads. */
type StreamPart =
  | { type: "text-delta"; text?: string; delta?: string; textDelta?: string }
  | { type: "tool-input-start"; id: string; toolName: string }
  | { type: "tool-input-delta"; id: string; delta: string }
  | {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      input?: unknown;
      args?: unknown;
    }
  | { type: "finish"; finishReason?: string }
  | { type: "error"; error: unknown }
  | { type: string };

type StreamResult = {
  stream?: AsyncIterable<StreamPart>;
  fullStream?: AsyncIterable<StreamPart>;
};

export type AISDKModelOptions<Schema> = {
  /** The AI SDK's `streamText`, passed in so `ai` is not a dependency. */
  // `never` accepts the SDK's generic signature without importing its types.
  streamText: (options: never) => StreamResult;
  /** The AI SDK's `jsonSchema` helper. */
  jsonSchema: (schema: JsonSchema) => Schema;
  /** A language model, e.g. `anthropic("claude-…")` or `openai("gpt-…")`. */
  model: unknown;
  /** Other `streamText` settings (temperature, providerOptions, maxOutputTokens, …). */
  settings?: Record<string, unknown>;
};

const toModelMessages = (messages: readonly AgentMessage[]) =>
  messages.map((message) => {
    switch (message.role) {
      case "system":
      case "user":
        return { role: message.role, content: message.content };
      case "assistant":
        return {
          role: "assistant",
          content: [
            ...(message.content
              ? [{ type: "text", text: message.content }]
              : []),
            ...(message.toolCalls ?? []).map((call) => ({
              type: "tool-call",
              toolCallId: call.id,
              toolName: call.name,
              input: call.args,
            })),
          ],
        };
      case "tool":
        return {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: message.toolCallId,
              toolName: message.name,
              output: { type: "text", value: message.content },
            },
          ],
        };
    }
  });

/**
 * Adapts the Vercel AI SDK (v5 and later) to the agent's model interface.
 * Tools are declared without `execute`, so the SDK streams tool calls and
 * stops, and the agent runs them.
 *
 * ```ts
 * import { jsonSchema, streamText } from "ai";
 * const model = fromAISDK({ streamText, jsonSchema, model: openai("gpt-5") });
 * ```
 */
export function fromAISDK<Schema>(
  options: AISDKModelOptions<Schema>,
): WidgetAgentModel {
  const streamText = options.streamText as unknown as (
    settings: Record<string, unknown>,
  ) => StreamResult;
  return async function* aiSdkModel(
    messages,
    { tools, signal },
  ): AsyncIterable<AgentModelEvent> {
    const result = streamText({
      ...options.settings,
      model: options.model,
      messages: toModelMessages(messages),
      tools: Object.fromEntries(
        tools.map((tool) => [
          tool.name,
          {
            description: tool.description,
            inputSchema: options.jsonSchema(tool.inputSchema),
          },
        ]),
      ),
      ...(signal ? { abortSignal: signal } : {}),
    });
    const stream = result.stream ?? result.fullStream;
    if (!stream) throw new Error("streamText returned no stream");
    for await (const part of stream) {
      switch (part.type) {
        case "text-delta": {
          const p = part as {
            text?: string;
            delta?: string;
            textDelta?: string;
          };
          const text = p.text ?? p.delta ?? p.textDelta ?? "";
          if (text) yield { type: "text-delta", text };
          break;
        }
        case "tool-input-start": {
          const p = part as { id: string; toolName: string };
          yield {
            type: "tool-call-delta",
            id: p.id,
            name: p.toolName,
            argsTextDelta: "",
          };
          break;
        }
        case "tool-input-delta": {
          const p = part as { id: string; delta: string };
          yield { type: "tool-call-delta", id: p.id, argsTextDelta: p.delta };
          break;
        }
        case "tool-call": {
          const p = part as {
            toolCallId: string;
            toolName: string;
            input?: unknown;
            args?: unknown;
          };
          yield {
            type: "tool-call",
            id: p.toolCallId,
            name: p.toolName,
            args: p.input ?? p.args,
          };
          break;
        }
        case "finish": {
          const p = part as { finishReason?: string };
          yield {
            type: "finish",
            ...(p.finishReason ? { reason: p.finishReason } : {}),
          };
          break;
        }
        case "error":
          throw (part as { error: unknown }).error;
        default:
          break;
      }
    }
  };
}
