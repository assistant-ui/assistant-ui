import type { MessageStatus } from "@assistant-ui/core";

/** Known content block types from @langchain/core messages. */
export type LangChainContentBlock =
  | { type: "text"; text: string }
  | { type: "text_delta"; text: string }
  | { type: "image_url"; image_url: string | { url: string } }
  | { type: "thinking"; thinking: string }
  | {
      type: "reasoning";
      summary: Array<{ type: "summary_text"; text: string }>;
    }
  | { type: "tool_use" | "input_json_delta" };

export type LangChainToolCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
};

/**
 * Minimal duck-typed interface for BaseMessage class instances returned by
 * `useStream`. Used internally by the message converter.
 *
 * Uses `unknown` for `content` to remain compatible with
 * `@langchain/core`'s `MessageContent` union.
 */
export type LangChainBaseMessage = {
  _getType: () => string;
  content: unknown;
  id?: string | undefined;
  name?: string | undefined;
  additional_kwargs?: Record<string, unknown> | undefined;
  /** Present on AIMessage */
  tool_calls?: readonly LangChainToolCall[] | undefined;
  /** Present on ToolMessage */
  tool_call_id?: string | undefined;
  /** Completion status (AIMessage) or outcome status (ToolMessage) */
  status?: MessageStatus | "success" | "error" | undefined;
  /** Present on ToolMessage */
  artifact?: unknown;
};
