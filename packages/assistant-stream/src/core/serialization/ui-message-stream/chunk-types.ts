import type {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from "../../../utils/json/json-value";

type FinishReason =
  | "stop"
  | "length"
  | "content-filter"
  | "tool-calls"
  | "error"
  | "other"
  | "unknown";

type Usage = {
  inputTokens: number;
  outputTokens: number;
};

export type UIMessageStreamChunk =
  | { type: "start"; messageId?: string }
  | { type: "text-start"; id: string }
  | { type: "text-delta"; textDelta: string; id?: string }
  | { type: "text-delta"; delta: string; id: string }
  | { type: "text-end" }
  | { type: "reasoning-start"; id: string }
  | { type: "reasoning-delta"; delta: string }
  | { type: "reasoning-end" }
  | {
      type: "source";
      source: { sourceType: "url"; id: string; url: string; title?: string };
    }
  | { type: "source-url"; sourceId: string; url: string; title?: string }
  | {
      type: "source-document";
      sourceId: string;
      mediaType: string;
      title: string;
      filename?: string;
    }
  | { type: "file"; file: { mimeType: string; data: string } }
  | { type: "file"; url: string; mediaType: string }
  | {
      type: "component";
      component: {
        name: string;
        instanceId?: string;
        props?: ReadonlyJSONObject;
        parentId?: string;
      };
    }
  | {
      type: "tool-call-start";
      id: string;
      toolCallId: string;
      toolName: string;
    }
  | { type: "tool-call-delta"; argsText: string }
  | { type: "tool-call-end" }
  | { type: "tool-input-start"; toolCallId: string; toolName: string }
  | { type: "tool-input-delta"; toolCallId: string; inputTextDelta: string }
  | {
      type: "tool-input-available";
      toolCallId: string;
      toolName: string;
      input: ReadonlyJSONValue;
    }
  | {
      type: "tool-input-error";
      toolCallId: string;
      toolName: string;
      input: ReadonlyJSONValue;
      errorText: string;
    }
  | {
      type: "tool-output-available";
      toolCallId: string;
      output: ReadonlyJSONValue;
    }
  | { type: "tool-output-error"; toolCallId: string; errorText: string }
  | { type: "tool-output-denied"; toolCallId: string }
  | {
      type: "tool-result";
      toolCallId: string;
      result: ReadonlyJSONValue;
      isError?: boolean;
    }
  | { type: "start-step"; messageId?: string }
  | {
      type: "finish-step";
      finishReason?: FinishReason;
      usage?: Usage;
      isContinued?: boolean;
    }
  | { type: "finish"; finishReason?: FinishReason; usage?: Usage }
  | { type: "abort"; reason?: string }
  | { type: "message-metadata"; messageMetadata: unknown }
  | { type: "error"; errorText: string }
  | UIMessageStreamDataChunk;

export type UIMessageStreamDataChunk = {
  type: `data-${string}`;
  id?: string;
  data: ReadonlyJSONValue;
  transient?: boolean;
};
