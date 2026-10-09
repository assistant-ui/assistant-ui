import type { JsonSchema } from "../json-schema";

/** A tool call the model made, with its complete arguments. */
export type AgentToolCall = { id: string; name: string; args: unknown };

/** A provider-neutral chat message. */
export type AgentMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: AgentToolCall[] }
  | { role: "tool"; toolCallId: string; name: string; content: string };

/** A tool as the model sees it. */
export type AgentToolDeclaration = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
};

/**
 * What a model stream yields:
 * - `text-delta`: assistant text.
 * - `tool-call-delta`: a piece of a tool call's JSON arguments as they
 *   stream; `name` is required on the first delta of a call.
 * - `tool-call`: a tool call with complete arguments. Every call the model
 *   makes must end with one, whether or not it streamed deltas.
 * - `finish`: the response is complete.
 */
export type AgentModelEvent =
  | { type: "text-delta"; text: string }
  | {
      type: "tool-call-delta";
      id: string;
      name?: string;
      argsTextDelta: string;
    }
  | { type: "tool-call"; id: string; name: string; args: unknown }
  | { type: "finish"; reason?: string };

/**
 * A streaming chat model: given the conversation and the available tools,
 * stream one assistant response. The agent runs the tools itself, so the
 * model function must not execute them.
 */
export type WidgetAgentModel = (
  messages: readonly AgentMessage[],
  options: { tools: readonly AgentToolDeclaration[]; signal?: AbortSignal },
) => AsyncIterable<AgentModelEvent>;
